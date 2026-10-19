// No server-only: the email templates' unit tests import this directly.
import type Stripe from "stripe";
import type { PaidAmount } from "./schema";

/** The amount a Checkout session charged, or undefined when Stripe didn't report one. */
export function sessionPaidAmount(session: Pick<Stripe.Checkout.Session, "amount_total" | "currency">): PaidAmount | undefined {
  return typeof session.amount_total === "number" && session.currency ? { amount: session.amount_total, currency: session.currency } : undefined;
}

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const GBP_WHOLE = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** "£14", "£14.50". Undefined for anything but GBP (Checkout only charges GBP), so copy drops the price instead. */
export function formatPaidAmount(paid: PaidAmount | undefined): string | undefined {
  if (!paid || paid.currency.toLowerCase() !== "gbp" || !Number.isInteger(paid.amount) || paid.amount < 0) return undefined;
  return (paid.amount % 100 === 0 ? GBP_WHOLE : GBP).format(paid.amount / 100);
}
