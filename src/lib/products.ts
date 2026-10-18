export type ProductId = "kit" | "shiploop_preorder";

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
  shiploop_preorder: {
    id: "shiploop_preorder",
    name: "Ship Loop founding pre-order",
    description: "One-time £99 payment covering your first year of Ship Loop once it launches. Refunded in full if Ship Loop isn't live within 12 months.",
    amountPence: 9900,
    priceLabel: "£99 one-time",
  },
};

export const isProductId = (v: unknown): v is ProductId => typeof v === "string" && v in PRODUCTS;

/** The kit, or the Ship Loop pre-order. */
export type ProductType = "kit" | "shiploop";
export const productType = (product: ProductId): ProductType => (product === "kit" ? "kit" : "shiploop");

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
