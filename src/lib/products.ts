export type ProductId = "kit" | "shiploop_monthly" | "shiploop_yearly";

export interface Product {
  id: ProductId;
  name: string;
  description: string;
  amountPence: number;
  priceLabel: string;
}

export const PRODUCTS: Record<ProductId, Product> = {
  kit: {
    id: "kit",
    name: "LaunchLoop Launch Kit",
    description: "Landing copy, Product Hunt post, X thread, LinkedIn post, 3 on-brand social images and a launch checklist.",
    amountPence: 1900,
    priceLabel: "£19",
  },
  shiploop_monthly: {
    id: "shiploop_monthly",
    name: "Ship Loop pre-order (monthly)",
    description: "First month of Ship Loop, charged now and fully refundable until launch. Then £12/month.",
    amountPence: 1200,
    priceLabel: "£12/month",
  },
  shiploop_yearly: {
    id: "shiploop_yearly",
    name: "Ship Loop pre-order (yearly)",
    description: "First year of Ship Loop, charged now and fully refundable until launch. Then £99/year.",
    amountPence: 9900,
    priceLabel: "£99/year",
  },
};

export const isProductId = (v: unknown): v is ProductId => typeof v === "string" && v in PRODUCTS;

/**
 * The exp_launch14_promo treatment: Stripe promotion code LAUNCH14 (£5 off the kit, once).
 * The code and its limits live in Stripe; this only mirrors the amount for the paywall copy.
 */
export const LAUNCH_PROMO = {
  code: "LAUNCH14",
  amountOffPence: 500,
  priceLabel: "£14",
} as const;

/** What the buyer pays, in pence, with or without the launch promo. */
export function chargedPence(product: ProductId, promo: boolean): number {
  const base = PRODUCTS[product].amountPence;
  return product === "kit" && promo ? base - LAUNCH_PROMO.amountOffPence : base;
}
