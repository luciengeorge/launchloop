import { expect, test } from "@playwright/test";
import { PreorderUnavailableError, RecurringPriceError, assertOneTimePrice, launchPromoDue, preorderAvailable, sessionParams } from "../../src/lib/checkout-session";

const urls = { successUrl: "https://launchloop.dev/api/checkout/return?session_id={CHECKOUT_SESSION_ID}", cancelUrl: "https://launchloop.dev/ship-loop?checkout=cancelled" };

test.describe("Checkout session params", () => {
  test("kit: one-time payment, signed in (account's Customer) and signed out (guest, no Customer created)", () => {
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
      customer_creation: "if_required",
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

  test("shiploop_preorder: one-time payment with STRIPE_PRICE_SHIPLOOP_PREORDER, signed in and signed out", () => {
    const metadata = { product: "shiploop_preorder", env: "production", ph_distinct_id: "ph_1" };
    const signedIn = sessionParams({ product: "shiploop_preorder", priceId: "price_pre", metadata, customer: "cus_1", email: "a@b.co", ...urls });
    expect(signedIn).toEqual({
      mode: "payment",
      line_items: [{ price: "price_pre", quantity: 1 }],
      customer: "cus_1",
      metadata,
      payment_intent_data: { metadata },
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
    });
    expect(signedIn).not.toHaveProperty("subscription_data");
    const signedOut = sessionParams({ product: "shiploop_preorder", priceId: "price_pre", metadata, ...urls });
    expect(signedOut).toMatchObject({ mode: "payment", customer_creation: "always", payment_intent_data: { metadata } });
    expect(signedOut).not.toHaveProperty("customer");
  });

  test("promo codes: LAUNCH14 only on kit sessions, never on the Ship Loop pre-order", () => {
    const treatment = { exp_launch14_promo: "treatment" } as const;
    expect(launchPromoDue("kit", treatment)).toBe(true);
    expect(launchPromoDue("kit", { exp_launch14_promo: "control" })).toBe(false);
    expect(launchPromoDue("kit", {})).toBe(false);
    expect(launchPromoDue("shiploop_preorder", treatment)).toBe(false);

    const kit = sessionParams({ product: "kit", priceId: "price_kit", metadata: { product: "kit", promo_code: "LAUNCH14" }, customer: "cus_1", promotionCode: "promo_launch14", ...urls });
    expect(kit.discounts).toEqual([{ promotion_code: "promo_launch14" }]);
    expect(kit).not.toHaveProperty("allow_promotion_codes");
    expect(sessionParams({ product: "kit", priceId: "price_kit", metadata: {}, ...urls })).not.toHaveProperty("discounts");
    // LAUNCH14 is first-time-only, which Stripe says is invalid without a Customer, so a guest session carrying it creates one.
    const guestPromo = sessionParams({ product: "kit", priceId: "price_kit", metadata: {}, promotionCode: "promo_launch14", ...urls });
    expect(guestPromo).toMatchObject({ customer_creation: "always", discounts: [{ promotion_code: "promo_launch14" }] });
    expect(guestPromo).not.toHaveProperty("customer");

    const preorder = sessionParams({ product: "shiploop_preorder", priceId: "price_pre", metadata: {}, promotionCode: "promo_launch14", ...urls });
    expect(preorder).not.toHaveProperty("discounts");
    expect(preorder).not.toHaveProperty("allow_promotion_codes");
  });

  test("shiploop_preorder without its price refuses rather than charging an inline price", () => {
    expect(() => sessionParams({ product: "shiploop_preorder", metadata: {}, ...urls })).toThrow(PreorderUnavailableError);
  });

  test("recurring prices are refused in payment mode", () => {
    expect(() => assertOneTimePrice({ id: "price_yearly", type: "recurring" }, "shiploop_preorder")).toThrow(RecurringPriceError);
    expect(() => assertOneTimePrice({ id: "price_yearly", type: "recurring" }, "shiploop_preorder")).toThrow(/price_yearly .* recurring/);
    expect(() => assertOneTimePrice({ id: "price_kit", type: "recurring" }, "kit")).toThrow(RecurringPriceError);
    expect(() => assertOneTimePrice({ id: "price_pre", type: "one_time" }, "shiploop_preorder")).not.toThrow();
  });

  test("the pre-order CTA needs STRIPE_PRICE_SHIPLOOP_PREORDER once Stripe is configured", () => {
    expect(preorderAvailable(true, "price_pre")).toBe(true);
    expect(preorderAvailable(true, undefined)).toBe(false);
    // Mock mode sells it through the mock checkout.
    expect(preorderAvailable(false, undefined)).toBe(true);
  });
});
