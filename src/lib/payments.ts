import "server-only";
import Stripe from "stripe";
import { deployEnv, stripeEventDecision } from "./deploy-env";
import { env, isStripeMock } from "./env";
import { PRODUCTS, type ProductId } from "./products";

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

/**
 * Returns the URL to send the buyer to: Stripe Checkout, or the local mock checkout in test mode.
 * Pass `customer` (from ensureStripeCustomer) to bill the account's existing Stripe customer;
 * otherwise Checkout creates a new customer for `email` or whatever the buyer enters.
 */
export async function createCheckoutUrl(params: { product: ProductId; origin: string; kitId?: string; email?: string; customer?: string }): Promise<string> {
  const { product, origin, kitId, email, customer } = params;
  const s = stripe();
  if (!s) {
    const qs = new URLSearchParams({ product, ...(kitId ? { kitId } : {}), ...(email ? { email } : {}) });
    // Relative, so the buyer stays on the host (and session cookie) they started on.
    return `/checkout/mock?${qs}`;
  }
  const item = PRODUCTS[product];
  const priceId = priceIds[product];
  const session = await s.checkout.sessions.create({
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
    allow_promotion_codes: true,
    metadata: { product, env: deployEnv(), ...(kitId ? { kitId } : {}) },
    payment_intent_data: { metadata: { product, env: deployEnv(), ...(kitId ? { kitId } : {}) } },
    success_url: `${origin}/api/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: kitId ? `${origin}/kit/${kitId}?checkout=cancelled` : `${origin}/ship-loop?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return session.url;
}

/** Whether this deployment owns a Checkout session (see stripeEventDecision). */
export function checkoutDecision(session: Stripe.Checkout.Session) {
  return stripeEventDecision({ metadataEnv: session.metadata?.env, livemode: session.livemode, current: deployEnv(), secretKey: env.stripeSecretKey });
}
