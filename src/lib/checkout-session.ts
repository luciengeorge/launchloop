import type Stripe from "stripe";
import { EXPERIMENTS, type Experiments } from "./experiments";
import { PRODUCTS, type ProductId } from "./products";

/**
 * Stripe Checkout session params and price guards. Pure (no server-only or env) so Playwright can
 * unit-test them. Every product is a one-time payment: Checkout's payment mode rejects recurring prices.
 */

/** A recurring price reached payment-mode Checkout, which Stripe would reject. A STRIPE_PRICE_* env var points at the wrong price. */
export class RecurringPriceError extends Error {
  name = "RecurringPriceError";
  constructor(priceId: string, product: ProductId) {
    super(`Price ${priceId} for ${product} is recurring, but Checkout runs in payment mode and only takes one-time prices. Point its STRIPE_PRICE_* env var at a one-time price.`);
  }
}

export const SHIP_LOOP_WAITLIST_ONLY = "Ship Loop isn't on sale. Join the waitlist, we'll email you when it launches.";

/**
 * The kit is the only thing Checkout sells. Ship Loop (monthly, yearly, pre-order or anything else) is a free waitlist,
 * so every other product gets a 400 with the waitlist message before Stripe is touched.
 */
export function checkoutRejection(product: unknown): { status: 400; error: string; code: "waitlist_only" } | null {
  return product === "kit" ? null : { status: 400, error: SHIP_LOOP_WAITLIST_ONLY, code: "waitlist_only" };
}

/** LAUNCH14 is only for kit sessions in the exp_launch14_promo treatment. */
export const launchPromoDue = (product: ProductId, experiments: Experiments) => product === "kit" && experiments[EXPERIMENTS.launchPromo] === "treatment";

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
  /** LAUNCH14's promotion code id. Only applied to the kit. */
  promotionCode?: string;
}

/**
 * A guest kit purchase needs no Customer: the email comes back in customer_details and the webhook links the
 * kit by it. LAUNCH14 is first-time-only, and Stripe's API reference says such codes are invalid on sessions
 * that don't create a Customer, so a session carrying it keeps "always".
 */
export const guestCustomerCreation = (promotionCode?: string) => (promotionCode ? ("always" as const) : ("if_required" as const));

export function sessionParams({ product, priceId, metadata, customer, email, successUrl, cancelUrl, promotionCode }: SessionInput): Stripe.Checkout.SessionCreateParams {
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
    ...(customer ? { customer } : { customer_email: email, customer_creation: guestCustomerCreation(promotionCode) }),
    // No free-text promotion code field: kit buyers only get LAUNCH14 through the promo experiment
    // (a field would let the control arm type it too).
    ...(promotionCode && product === "kit" ? { discounts: [{ promotion_code: promotionCode }] } : {}),
    metadata,
    payment_intent_data: { metadata },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
}
