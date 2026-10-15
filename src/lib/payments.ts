import "server-only";
import Stripe from "stripe";
import { deployEnv, stripeEventDecision } from "./deploy-env";
import { env, isStripeMock } from "./env";
import { EXPERIMENTS, withAnalyticsId, type Experiments } from "./experiments";
import { captureException, captureMessage } from "./observability";
import { LAUNCH_PROMO, PRODUCTS, chargedPence, type ProductId } from "./products";

let client: Stripe | null = null;
export function stripe(): Stripe | null {
  if (isStripeMock()) return null;
  client ??= new Stripe(env.stripeSecretKey!);
  return client;
}

const priceIds: Record<ProductId, string | undefined> = {
  kit: env.stripePriceKit,
  shiploop_monthly: env.stripePriceShipLoopMonthly,
  shiploop_yearly: env.stripePriceShipLoopYearly,
};

/** What Checkout charges, for analytics. "inline" means no STRIPE_PRICE_* is set. */
export function checkoutPrice(product: ProductId, promo = false) {
  return {
    price_id: priceIds[product] ?? "inline",
    amount: chargedPence(product, promo),
    currency: "gbp",
    ...(promo ? { promo_code: LAUNCH_PROMO.code } : {}),
  };
}

export interface CheckoutRequest {
  product: ProductId;
  origin: string;
  kitId?: string;
  email?: string;
  /** The account's existing Stripe customer (from ensureStripeCustomer). Otherwise Checkout creates one for `email` or whatever the buyer enters. */
  customer?: string;
  /** PostHog distinct id, so the webhook's checkout_completed joins the browser's funnel. */
  analyticsId: string;
  isLoggedIn: boolean;
  /** Variants the buyer was shown. exp_launch14_promo "treatment" puts LAUNCH14 on a kit session. */
  experiments: Experiments;
}

/** "unavailable": the promo was due but Stripe wouldn't take the code (ended, used up, not a first purchase), so the session is full price. */
export type PromoOutcome = "applied" | "unavailable" | "none";

export interface CheckoutResult {
  url: string;
  promo: PromoOutcome;
}

/** Returns where to send the buyer: Stripe Checkout, or the local mock checkout in test mode. */
export async function createCheckoutUrl(params: CheckoutRequest): Promise<CheckoutResult> {
  const { product, origin, kitId, email, customer, analyticsId, isLoggedIn, experiments } = params;
  const promo = product === "kit" && experiments[EXPERIMENTS.launchPromo] === "treatment";
  const s = stripe();
  if (!s) {
    const qs = new URLSearchParams({
      product,
      aid: analyticsId,
      ...(kitId ? { kitId } : {}),
      ...(email ? { email } : {}),
      ...(promo ? { promo: LAUNCH_PROMO.code } : {}),
    });
    // Relative, so the buyer stays on the host (and session cookie) they started on.
    return { url: `/checkout/mock?${qs}`, promo: promo ? "applied" : "none" };
  }

  const item = PRODUCTS[product];
  const priceId = priceIds[product];
  const metadata = {
    product,
    env: deployEnv(),
    price_id: checkoutPrice(product).price_id,
    ph_distinct_id: analyticsId,
    logged_in: isLoggedIn ? "1" : "0",
    ...experiments,
    ...(kitId ? { kitId } : {}),
  };
  const cancelPath = kitId ? `/kit/${kitId}?checkout=cancelled` : "/ship-loop?checkout=cancelled";
  const base: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      priceId
        ? { price: priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: "gbp",
              unit_amount: item.amountPence,
              product_data: { name: item.name, description: item.description },
            },
          },
    ],
    // A Customer lets buyers manage billing in the Customer Portal from /account. Stripe rejects
    // `customer` alongside `customer_email` or `customer_creation`.
    ...(customer ? { customer } : { customer_email: email, customer_creation: "always" as const }),
    // Kit buyers only get a code through the promo experiment; a free-text field would let the
    // control arm type LAUNCH14 too.
    ...(product === "kit" ? {} : { allow_promotion_codes: true }),
    metadata,
    payment_intent_data: { metadata },
    success_url: `${origin}/api/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${withAnalyticsId(cancelPath, analyticsId)}`,
  };

  if (promo) {
    const promotionCode = await launchPromoId(s);
    if (promotionCode) {
      const promoMetadata = { ...metadata, promo_code: LAUNCH_PROMO.code };
      try {
        const url = await createSession(s, { ...base, discounts: [{ promotion_code: promotionCode }], metadata: promoMetadata, payment_intent_data: { metadata: promoMetadata } });
        return { url, promo: "applied" };
      } catch (error) {
        if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) throw error;
        captureException(error, { stage: "payments.promo", code: LAUNCH_PROMO.code });
      }
    } else {
      captureMessage("Launch promo code is not active in Stripe", { code: LAUNCH_PROMO.code });
    }
    return { url: await createSession(s, base), promo: "unavailable" };
  }
  return { url: await createSession(s, base), promo: "none" };
}

async function createSession(s: Stripe, params: Stripe.Checkout.SessionCreateParams): Promise<string> {
  const session = await s.checkout.sessions.create(params);
  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return session.url;
}

let promoIdCache: string | undefined;

/** STRIPE_PROMO_LAUNCH14 when set, else the active promotion code named LAUNCH14 (looked up once per instance). */
async function launchPromoId(s: Stripe): Promise<string | undefined> {
  if (env.stripePromoLaunch14) return env.stripePromoLaunch14;
  if (promoIdCache) return promoIdCache;
  try {
    const { data } = await s.promotionCodes.list({ code: LAUNCH_PROMO.code, active: true, limit: 1 });
    promoIdCache = data[0]?.id;
  } catch (error) {
    captureException(error, { stage: "payments.promo.lookup", code: LAUNCH_PROMO.code });
  }
  return promoIdCache;
}

/**
 * The promotion code a paid session used: LAUNCH14 from our metadata, else one the buyer typed
 * (Ship Loop allows codes), which Stripe only gives us as a promotion code id.
 */
export async function sessionPromoCode(s: Stripe, session: Stripe.Checkout.Session): Promise<string | undefined> {
  if (session.metadata?.promo_code) return session.metadata.promo_code;
  const promo = session.discounts?.find((d) => d.promotion_code)?.promotion_code;
  if (!promo) return undefined;
  if (typeof promo !== "string") return promo.code;
  try {
    return (await s.promotionCodes.retrieve(promo)).code;
  } catch (error) {
    captureException(error, { stage: "payments.promo.session", sessionId: session.id });
    return undefined;
  }
}

/** Whether this deployment owns a Checkout session (see stripeEventDecision). */
export function checkoutDecision(session: Stripe.Checkout.Session) {
  return stripeEventDecision({ metadataEnv: session.metadata?.env, livemode: session.livemode, current: deployEnv(), secretKey: env.stripeSecretKey });
}
