import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    after: vi.fn((fn: () => unknown) => void pending.push(Promise.resolve().then(fn))),
    recordPayment: vi.fn<(order: unknown) => Promise<void>>(async () => {}),
    fulfilKit: vi.fn<(id: string) => Promise<void>>(async () => {}),
    captureServerEvent: vi.fn<(event: string, params: unknown) => Promise<void>>(async () => {}),
    captureException: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("@/lib/env", () => ({ env: { stripeWebhookSecret: "whsec_unit", stripeSecretKey: "sk_test_unit" } }));
vi.mock("@/lib/payments", () => ({
  // Signature checks are Stripe's job; the test body is the event itself.
  stripe: () => ({ webhooks: { constructEvent: (body: string) => JSON.parse(body) } }),
  sessionPromoCode: async () => undefined,
}));
vi.mock("@/lib/fulfil", () => ({ recordPayment: m.recordPayment, fulfilKit: m.fulfilKit }));
vi.mock("@/lib/analytics-server", () => ({
  captureServerEvent: m.captureServerEvent,
  eventUuid: (seed: string) => `uuid:${seed}`,
  resolveDistinctId: (id: unknown) => (typeof id === "string" ? id : "server_x"),
}));
vi.mock("@/lib/observability", async (importOriginal) => ({ ...(await importOriginal<object>()), captureException: m.captureException }));

const { POST } = await import("@/app/api/stripe/webhook/route");

let eventSeq = 0;
function checkoutEvent(session: Record<string, unknown>, type = "checkout.session.completed") {
  return {
    id: `evt_${++eventSeq}`,
    type,
    livemode: false,
    data: {
      object: {
        id: `cs_test_${eventSeq}`,
        payment_status: "paid",
        amount_total: 1900,
        currency: "gbp",
        customer: "cus_1",
        customer_details: { email: "buyer@example.com" },
        metadata: { product: "kit", kitId: "kit_abc", env: "development", ph_distinct_id: "ph_1", price_id: "price_kit", logged_in: "1", utm_source: "hn" },
        ...session,
      },
    },
  };
}

async function deliver(event: object) {
  const res = await POST(new Request("http://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=x" }, body: JSON.stringify(event) }));
  await Promise.all(m.pending.splice(0));
  return res;
}

const eventsNamed = (name: string) => m.captureServerEvent.mock.calls.filter(([event]) => event === name).map(([, params]) => params as { uuid?: string; properties: Record<string, unknown> });

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Stripe webhook", () => {
  it("records, fulfils and tracks a paid kit checkout", async () => {
    const event = checkoutEvent({});
    const res = await deliver(event);

    expect(res.status).toBe(200);
    expect(m.recordPayment).toHaveBeenCalledWith(expect.objectContaining({ product: "kit", kitId: "kit_abc", ref: event.data.object.id }));
    expect(m.fulfilKit).toHaveBeenCalledWith("kit_abc");
    const [completed] = eventsNamed("checkout_completed");
    expect(completed.properties).toMatchObject({ plan: "kit", amount: 1900, stripeSessionId: event.data.object.id, utm_source: "hn" });
  });

  it("treats a 100%-off checkout (no_payment_required) as paid, with amount 0", async () => {
    const event = checkoutEvent({ payment_status: "no_payment_required", amount_total: 0 });
    expect((await deliver(event)).status).toBe(200);

    expect(m.recordPayment).toHaveBeenCalledTimes(1);
    expect(m.fulfilKit).toHaveBeenCalledWith("kit_abc");
    expect(eventsNamed("checkout_completed")[0].properties).toMatchObject({ amount: 0, plan: "kit" });
  });

  it("waits for async payments instead of fulfilling an unpaid session", async () => {
    await deliver(checkoutEvent({ payment_status: "unpaid" }));
    expect(m.recordPayment).not.toHaveBeenCalled();
    expect(eventsNamed("checkout_completed")).toHaveLength(0);
  });
});
