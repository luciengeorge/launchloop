export type ProductId = "kit" | "directoryPack";

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
  /** Not approved for sale: nothing shows this price or a Buy button until STRIPE_DIRECTORY_PACK_PRICE_ID is set (see directoryPackOffer). */
  directoryPack: {
    id: "directoryPack",
    name: "LaunchLoop Directory Launch Pack",
    description: "The researched startup directory database with submit links and rules, plus listing copy written for each directory.",
    amountPence: 2900,
    priceLabel: "£29",
  },
};

export const isProductId = (v: unknown): v is ProductId => typeof v === "string" && v in PRODUCTS;

/** Analytics `product_type`. Ship Loop is a waitlist, so it's never a purchase. */
export type ProductType = "kit" | "directory_pack" | "shiploop";
export function productType(product: ProductId): ProductType {
  switch (product) {
    case "kit":
      return "kit";
    case "directoryPack":
      return "directory_pack";
    default: {
      const unhandled: never = product;
      return unhandled;
    }
  }
}

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
