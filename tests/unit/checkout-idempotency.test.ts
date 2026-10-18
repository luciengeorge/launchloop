import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMock = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("stripe", () => {
  class StripeInvalidRequestError extends Error {}
  class FakeStripe {
    static errors = { StripeInvalidRequestError };
    checkout = { sessions: { create: stripeMock.create } };
    promotionCodes = { list: vi.fn(async () => ({ data: [] })) };
  }
  return { default: FakeStripe };
});
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_idempotency");
vi.stubEnv("MOCK_MODE", "");
const { checkoutIdempotencyKey, createCheckoutUrl } = await import("@/lib/payments");

const kitCheckout = { product: "kit" as const, origin: "https://launchloop.dev", kitId: "kit_abcdefghijklmnop", customer: "cus_1", analyticsId: "ph_1", isLoggedIn: true, experiments: {}, fallbacks: [] };

beforeEach(() => {
  stripeMock.create.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
});

describe("Checkout idempotency", () => {
  it("sends an idempotency key, the same one for a repeat click", async () => {
    await createCheckoutUrl(kitCheckout);
    await createCheckoutUrl(kitCheckout);
    const [first, second] = stripeMock.create.mock.calls.map(([, options]) => options?.idempotencyKey);
    expect(first).toMatch(/^checkout_[\w-]{20,}$/);
    expect(second).toBe(first);
  });

  it("changes with the kit, the buyer, the promo and the 10-minute bucket", () => {
    const now = Date.UTC(2026, 9, 18, 9, 1);
    const base = { mode: "payment" as const, customer: "cus_1", metadata: { product: "kit", kitId: "kit_a" } };
    const key = checkoutIdempotencyKey(base, now);
    expect(checkoutIdempotencyKey(base, now + 5 * 60_000)).toBe(key);
    expect(checkoutIdempotencyKey(base, now + 10 * 60_000)).not.toBe(key);
    expect(checkoutIdempotencyKey({ ...base, metadata: { product: "kit", kitId: "kit_b" } }, now)).not.toBe(key);
    expect(checkoutIdempotencyKey({ ...base, customer: "cus_2" }, now)).not.toBe(key);
    expect(checkoutIdempotencyKey({ ...base, discounts: [{ promotion_code: "promo_1" }] }, now)).not.toBe(key);
    expect(checkoutIdempotencyKey({ mode: "payment", customer_email: "a@example.com", metadata: { product: "shiploop_monthly" } }, now)).not.toBe(
      checkoutIdempotencyKey({ mode: "payment", customer_email: "b@example.com", metadata: { product: "shiploop_monthly" } }, now),
    );
  });
});
