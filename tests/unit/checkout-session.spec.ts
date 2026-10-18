import { expect, test } from "@playwright/test";
import { RecurringPriceError, SHIP_LOOP_WAITLIST_ONLY, assertOneTimePrice, checkoutRejection, launchPromoDue, sessionParams } from "../../src/lib/checkout-session";

const urls = { successUrl: "https://launchloop.dev/api/checkout/return?session_id={CHECKOUT_SESSION_ID}", cancelUrl: "https://launchloop.dev/kit/k1?checkout=cancelled" };

test.describe("Checkout session params", () => {
  test("kit: unchanged one-time payment, signed in and signed out", () => {
    const metadata = { product: "kit", env: "production", kitId: "k1" };
    const line = { price: "price_kit", quantity: 1 };
    expect(sessionParams({ product: "kit", priceId: "price_kit", metadata, customer: "cus_1", email: "a@b.co", ...urls })).toEqual({
      mode: "payment",
      line_items: [line],
      customer: "cus_1",
      metadata,
      payment_intent_data: { metadata },
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
    });
    expect(sessionParams({ product: "kit", priceId: "price_kit", metadata, email: "a@b.co", ...urls })).toEqual({
      mode: "payment",
      line_items: [line],
      customer_email: "a@b.co",
      customer_creation: "always",
      metadata,
      payment_intent_data: { metadata },
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
    });
    // No STRIPE_PRICE_KIT: inline £19.
    expect(sessionParams({ product: "kit", metadata, ...urls }).line_items).toEqual([
      { quantity: 1, price_data: { currency: "gbp", unit_amount: 1900, product_data: { name: "LaunchLoop Launch Kit", description: expect.any(String) } } },
    ]);
  });

  test("promo codes: LAUNCH14 only on kit sessions in the treatment", () => {
    const treatment = { exp_launch14_promo: "treatment" } as const;
    expect(launchPromoDue("kit", treatment)).toBe(true);
    expect(launchPromoDue("kit", { exp_launch14_promo: "control" })).toBe(false);
    expect(launchPromoDue("kit", {})).toBe(false);

    const kit = sessionParams({ product: "kit", priceId: "price_kit", metadata: { product: "kit", promo_code: "LAUNCH14" }, customer: "cus_1", promotionCode: "promo_launch14", ...urls });
    expect(kit.discounts).toEqual([{ promotion_code: "promo_launch14" }]);
    expect(kit).not.toHaveProperty("allow_promotion_codes");
    expect(sessionParams({ product: "kit", priceId: "price_kit", metadata: {}, ...urls })).not.toHaveProperty("discounts");
  });

  test("recurring prices are refused in payment mode", () => {
    expect(() => assertOneTimePrice({ id: "price_yearly", type: "recurring" }, "kit")).toThrow(RecurringPriceError);
    expect(() => assertOneTimePrice({ id: "price_yearly", type: "recurring" }, "kit")).toThrow(/price_yearly .* recurring/);
    expect(() => assertOneTimePrice({ id: "price_kit", type: "one_time" }, "kit")).not.toThrow();
  });
});

test.describe("/api/checkout product guard", () => {
  test("only the kit gets through", () => {
    expect(checkoutRejection("kit")).toBeNull();
  });

  test("every Ship Loop product, and anything else that isn't the kit, is a 400 with the waitlist message", () => {
    for (const product of ["shiploop_monthly", "shiploop_yearly", "shiploop_preorder", "shiploop", "Kit", "", undefined, null, 42, { product: "kit" }]) {
      expect(checkoutRejection(product), JSON.stringify(product)).toEqual({ status: 400, error: SHIP_LOOP_WAITLIST_ONLY, code: "waitlist_only" });
    }
    expect(SHIP_LOOP_WAITLIST_ONLY).toBe("Ship Loop isn't on sale. Join the waitlist, we'll email you when it launches.");
  });
});
