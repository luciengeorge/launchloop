import type Stripe from "stripe";
import { PRODUCTS, type ProductId } from "./products";

/**
 * Stripe Checkout session params and price guards. Pure (no server-only or env) so Playwright can
 * unit-test them. Every product is a one-time payment: Checkout's payment mode rejects recurring prices.
 */

/** The Ship Loop pre-order can't be sold here: STRIPE_PRICE_SHIPLOOP_PREORDER is missing or not in this Stripe account. */
export class PreorderUnavailableError extends Error {
  name = "PreorderUnavailableError";
}

/** A recurring price reached payment-mode Checkout, which Stripe would reject. A STRIPE_PRICE_* env var points at the wrong price. */
export class RecurringPriceError extends Error {
  name = "RecurringPriceError";
  constructor(priceId: string, product: ProductId) {
    super(`Price ${priceId} for ${product} is recurring, but Checkout runs in payment mode and only takes one-time prices. Point its STRIPE_PRICE_* env var at a one-time price.`);
  }
}

/** Mock mode sells the pre-order through the mock checkout; real Stripe needs STRIPE_PRICE_SHIPLOOP_PREORDER (there is no inline fallback). */
export const preorderAvailable = (stripeConfigured: boolean, preorderPriceId: string | undefined) => !stripeConfigured || !!preorderPriceId;

export function assertOneTimePrice(price: Pick<Stripe.Price, "id" | "type">, product: ProductId): void {
  if (price.type !== "one_time") throw new RecurringPriceError(price.id, product);
}

export interface SessionInput {
  product: ProductId;
  priceId?: string;
  metadata: Record<string, string>;
  customer?: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}

export function sessionParams({ product, priceId, metadata, customer, email, successUrl, cancelUrl }: SessionInput): Stripe.Checkout.SessionCreateParams {
  if (product === "shiploop_preorder" && !priceId) throw new PreorderUnavailableError("STRIPE_PRICE_SHIPLOOP_PREORDER is not set");
  const item = PRODUCTS[product];
  return {
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
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
}
