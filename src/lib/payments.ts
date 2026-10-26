import "server-only";
import { createHash } from "node:crypto";
import Stripe from "stripe";
import { type Attribution, attributionMetadata } from "./attribution";
import { deployEnv, stripeEventDecision } from "./deploy-env";
import { env, isStripeMock } from "./env";
import { withAnalyticsId, type ExperimentKey, type Experiments } from "./experiments";
import { captureException, captureMessage } from "./observability";
import { assertOneTimePrice, launchPromoDue, sessionParams, type SessionInput } from "./checkout-session";
import { LAUNCH_PROMO, chargedPence, isProductId, type ProductId } from "./products";

let client: Stripe | null = null;
export function stripe(): Stripe | null {
  if (isStripeMock()) return null;
  client ??= new Stripe(env.stripeSecretKey!);
  return client;
}

const priceIds: Record<ProductId, string | undefined> = {
  kit: env.stripePriceKit,
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
  /** Variants recorded in the session metadata for checkout_completed. exp_launch14_promo is the server's, never the request's. */
  experiments: Experiments;
  /** Experiments whose variant was a fallback, not a PostHog assignment (see Served). */
  fallbacks: ExperimentKey[];
  /** The kit's first-touch UTMs, copied into metadata so the webhook's checkout_completed carries them. */
  attribution?: Attribution;
}

/** "unavailable": the promo was due but Stripe wouldn't take the code (ended, used up, not a first purchase), so the session is full price. */
export type PromoOutcome = "applied" | "unavailable" | "none";

export interface CheckoutResult {
  url: string;
  promo: PromoOutcome;
}

/** Production has no Stripe key, so there's nowhere to take payment. The mock checkout never stands in for it. */
export class CheckoutUnavailableError extends Error {
  constructor() {
    super("Stripe isn't configured in production, so checkout can't start");
    this.name = "CheckoutUnavailableError";
  }
}

/** Returns where to send the buyer: Stripe Checkout, or the local mock checkout in test mode. Throws CheckoutUnavailableError in production without Stripe. */
export async function createCheckoutUrl(params: CheckoutRequest): Promise<CheckoutResult> {
  const { product, origin, kitId, email, customer, analyticsId, isLoggedIn, experiments, fallbacks, attribution } = params;
  // experiments[exp_launch14_promo] is the server's resolution for the kit (resolveKitPromo in /api/checkout).
  const promo = launchPromoDue(product, experiments);
  const s = stripe();
  if (!s) {
    if (deployEnv() === "production") throw new CheckoutUnavailableError();
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

  const metadata = {
    product,
    env: deployEnv(),
    price_id: checkoutPrice(product).price_id,
    ph_distinct_id: analyticsId,
    logged_in: isLoggedIn ? "1" : "0",
    ...experiments,
    ...(fallbacks.length ? { fallbacks: fallbacks.join(",") } : {}),
    ...(kitId ? { kitId, ...attributionMetadata(attribution) } : {}),
  };
  const cancelPath = kitId ? `/kit/${kitId}?checkout=cancelled` : "/ship-loop?checkout=cancelled";
  const input: SessionInput = {
    product,
    priceId: priceIds[product],
    metadata,
    customer,
    email,
    successUrl: `${origin}/api/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}${withAnalyticsId(cancelPath, analyticsId)}`,
  };
  const base = sessionParams(input);

  if (promo) {
    const promotionCode = await launchPromoId(s);
    if (promotionCode) {
      try {
        const url = await createSession(s, sessionParams({ ...input, metadata: { ...metadata, promo_code: LAUNCH_PROMO.code }, promotionCode }));
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

const CHECKOUT_REUSE_MS = 10 * 60 * 1000;

/**
 * Same kit (or product), buyer and promo within a 10-minute bucket gets the same key, so double
 * clicks and retries reopen the first Checkout session instead of creating more. The full params
 * are hashed in too: a request that differs in anything else gets a fresh key, never Stripe's
 * "keys can only be used with the same parameters" error.
 */
export function checkoutIdempotencyKey(params: Stripe.Checkout.SessionCreateParams, now = Date.now()): string {
  const target = params.metadata?.kitId ?? params.metadata?.product ?? "";
  const buyer = params.customer ?? params.customer_email ?? "guest";
  const promo = params.discounts?.length ? "promo" : "full";
  const bucket = Math.floor(now / CHECKOUT_REUSE_MS);
  const digest = createHash("sha256").update(JSON.stringify([target, buyer, promo, bucket, params])).digest("base64url");
  return `checkout_${digest}`;
}

async function createSession(s: Stripe, params: Stripe.Checkout.SessionCreateParams): Promise<string> {
  const product = params.metadata?.product;
  if (params.mode === "payment" && isProductId(product)) {
    for (const item of params.line_items ?? []) if (item.price) await checkOneTimePrice(s, item.price, product);
  }
  const session = await s.checkout.sessions.create(params, { idempotencyKey: checkoutIdempotencyKey(params) });
  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return session.url;
}

const oneTimePrices = new Set<string>();

/** Throws RecurringPriceError for a recurring price. */
async function checkOneTimePrice(s: Stripe, priceId: string, product: ProductId): Promise<void> {
  if (oneTimePrices.has(priceId)) return;
  assertOneTimePrice(await s.prices.retrieve(priceId), product);
  oneTimePrices.add(priceId);
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
 * The promotion code a paid session used: LAUNCH14 from our metadata, else the session's discount,
 * which Stripe only gives us as a promotion code id.
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

/**
 * Where a paid kit lands: its page in /account for a signed-in buyer, else the guest success page,
 * which finds the buyer's email from the session id (kit.paymentRef) to prefill the magic link.
 */
export function kitSuccessPath(kitId: string, sessionRef: string, signedIn: boolean): string {
  return signedIn ? `/account/kits/${kitId}?paid=1` : `/checkout/success?${new URLSearchParams({ kit: kitId, session_id: sessionRef })}`;
}

/** A 100%-off Checkout completes with "no_payment_required": it's a purchase like any other. */
export const isPaidSession = (session: Pick<Stripe.Checkout.Session, "payment_status">) => session.payment_status === "paid" || session.payment_status === "no_payment_required";

/** Whether this deployment owns a Checkout session (see stripeEventDecision). */
export function checkoutDecision(session: Stripe.Checkout.Session) {
  return stripeEventDecision({ metadataEnv: session.metadata?.env, livemode: session.livemode, current: deployEnv(), secretKey: env.stripeSecretKey });
}
