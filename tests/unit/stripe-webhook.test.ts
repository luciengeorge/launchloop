import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const kv = new Map<string, unknown>();
  const pending: Promise<unknown>[] = [];
  return {
    kv,
    pending,
    after: vi.fn((fn: () => unknown) => void pending.push(Promise.resolve().then(fn))),
    recordPayment: vi.fn<(order: unknown) => Promise<{ ownership?: "account" | "pending" | "none" }>>(async () => ({ ownership: "pending" })),
    fulfilKit: vi.fn<(id: string) => Promise<void>>(async () => {}),
    captureServerEvent: vi.fn<(event: string, params: unknown) => Promise<void>>(async () => {}),
    captureException: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("@/lib/env", () => ({ env: { stripeWebhookSecret: "whsec_unit", stripeSecretKey: "sk_test_unit" } }));
vi.mock("@/lib/payments", async (importOriginal) => ({
  ...(await importOriginal<object>()),
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
vi.mock("@/lib/store", () => ({
  store: () => ({
    get: async (key: string) => m.kv.get(key) ?? null,
    set: async (key: string, value: unknown) => void m.kv.set(key, value),
  }),
}));

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

const logLines = () => (console.info as unknown as { mock: { calls: string[][] } }).mock.calls.map(([line]) => JSON.parse(line) as Record<string, unknown>);
const eventsNamed = (name: string) => m.captureServerEvent.mock.calls.filter(([event]) => event === name).map(([, params]) => params as { uuid?: string; properties: Record<string, unknown> });

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.kv.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Stripe webhook", () => {
  it("records, fulfils and tracks a paid kit checkout, and logs one line without PII", async () => {
    const event = checkoutEvent({});
    const res = await deliver(event);

    expect(res.status).toBe(200);
    expect(m.recordPayment).toHaveBeenCalledWith(expect.objectContaining({ product: "kit", kitId: "kit_abc", ref: event.data.object.id }));
    expect(m.fulfilKit).toHaveBeenCalledWith("kit_abc");
    const [completed] = eventsNamed("checkout_completed");
    expect(completed.properties).toMatchObject({ plan: "kit", amount: 1900, stripeSessionId: event.data.object.id, utm_source: "hn" });

    expect(logLines()).toEqual([{ event: "stripe.webhook", eventId: event.id, type: "checkout.session.completed", sessionId: event.data.object.id, paymentStatus: "paid", outcome: "fulfilled", ownership: "pending" }]);
    expect(JSON.stringify(logLines())).not.toMatch(/buyer@example\.com|cus_1|whsec|sk_test/);
  });

  it("treats a 100%-off checkout (no_payment_required) as paid, with amount 0", async () => {
    const event = checkoutEvent({ payment_status: "no_payment_required", amount_total: 0 });
    expect((await deliver(event)).status).toBe(200);

    expect(m.recordPayment).toHaveBeenCalledTimes(1);
    expect(m.fulfilKit).toHaveBeenCalledWith("kit_abc");
    expect(eventsNamed("checkout_completed")[0].properties).toMatchObject({ amount: 0, plan: "kit" });
    expect(logLines()[0]).toMatchObject({ paymentStatus: "no_payment_required", outcome: "fulfilled" });
  });

  it("waits for async payments instead of fulfilling an unpaid session", async () => {
    await deliver(checkoutEvent({ payment_status: "unpaid" }));
    expect(m.recordPayment).not.toHaveBeenCalled();
    expect(eventsNamed("checkout_completed")).toHaveLength(0);
    expect(logLines()[0]).toMatchObject({ outcome: "awaiting_payment" });
  });

  it("handles a redelivered event once, by event id", async () => {
    const event = checkoutEvent({});
    expect((await deliver(event)).status).toBe(200);
    const again = await deliver(event);

    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ duplicate: true });
    expect(m.recordPayment).toHaveBeenCalledTimes(1);
    expect(m.fulfilKit).toHaveBeenCalledTimes(1);
    expect(eventsNamed("checkout_completed")).toHaveLength(1);
    expect(logLines().map((l) => l.outcome)).toEqual(["fulfilled", "duplicate"]);
  });

  it("reports a failure to record the payment, returns 500 so Stripe retries, and succeeds on the retry", async () => {
    const event = checkoutEvent({});
    m.recordPayment.mockRejectedValueOnce(new Error("KV command SET failed with 503"));

    const res = await deliver(event);
    expect(res.status).toBe(500);
    expect(m.captureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ stage: "stripe.webhook.record", eventId: event.id, sessionId: event.data.object.id }));
    const [failed] = eventsNamed("checkout_fulfilment_failed");
    expect(failed).toMatchObject({ uuid: `uuid:checkout_fulfilment_failed:${event.id}:record`, properties: { stage: "record", plan: "kit", kitId: "kit_abc", stripeEventId: event.id, errorName: "Error" } });
    expect(m.fulfilKit).not.toHaveBeenCalled();
    expect(eventsNamed("checkout_completed")).toHaveLength(0);
    expect(logLines()[0]).toMatchObject({ outcome: "record_failed" });

    // Stripe's redelivery isn't treated as a duplicate: the failed attempt wasn't marked as handled.
    const retry = await deliver(event);
    expect(retry.status).toBe(200);
    expect(m.recordPayment).toHaveBeenCalledTimes(2);
    expect(m.fulfilKit).toHaveBeenCalledWith("kit_abc");
    expect(eventsNamed("checkout_completed")).toHaveLength(1);
  });

  it("reports a kit generation crash after the response to Sentry and PostHog", async () => {
    m.fulfilKit.mockRejectedValueOnce(new TypeError("store unavailable"));
    const event = checkoutEvent({});
    expect((await deliver(event)).status).toBe(200);

    expect(m.captureException).toHaveBeenCalledWith(expect.any(TypeError), expect.objectContaining({ stage: "stripe.webhook.fulfil", kitId: "kit_abc" }));
    expect(eventsNamed("checkout_fulfilment_failed")[0].properties).toMatchObject({ stage: "fulfil", errorName: "TypeError" });
  });

  it("logs and ignores other event types and other environments' sessions", async () => {
    await deliver({ id: "evt_other", type: "invoice.paid", livemode: false, data: { object: {} } });
    await deliver(checkoutEvent({ metadata: { product: "kit", kitId: "kit_abc", env: "production" } }));
    expect(m.recordPayment).not.toHaveBeenCalled();
    expect(logLines().map((l) => l.outcome)).toEqual(["ignored_type", "ignored_env"]);
  });
});
