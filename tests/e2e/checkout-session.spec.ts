import { expect, test } from "@playwright/test";
import { PreorderUnavailableError, RecurringPriceError, assertOneTimePrice, preorderAvailable, sessionParams } from "../../src/lib/checkout-session";

const urls = { successUrl: "https://launchloop.dev/api/checkout/return?session_id={CHECKOUT_SESSION_ID}", cancelUrl: "https://launchloop.dev/ship-loop?checkout=cancelled" };

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

  test("shiploop_preorder: one-time payment with STRIPE_PRICE_SHIPLOOP_PREORDER, signed in and signed out", () => {
    const metadata = { product: "shiploop_preorder", env: "production", ph_distinct_id: "ph_1" };
    const signedIn = sessionParams({ product: "shiploop_preorder", priceId: "price_pre", metadata, customer: "cus_1", email: "a@b.co", ...urls });
    expect(signedIn).toEqual({
      mode: "payment",
      line_items: [{ price: "price_pre", quantity: 1 }],
      customer: "cus_1",
      allow_promotion_codes: true,
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
