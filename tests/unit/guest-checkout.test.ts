import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Kit } from "@/lib/schema";

const m = vi.hoisted(() => {
  const kv = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();
  const jar = new Map<string, string>();
  const pending: Promise<unknown>[] = [];
  return {
    kv,
    sets,
    jar,
    pending,
    after: vi.fn((fn: () => unknown) => void pending.push(Promise.resolve().then(fn))),
    createSession: vi.fn<(params: Record<string, unknown>) => Promise<{ id: string; url: string }>>(async () => ({ id: "cs_test_new", url: "https://checkout.stripe.com/c/pay/cs_test_new" })),
    retrieveSession: vi.fn<(id: string) => Promise<Record<string, unknown>>>(),
    retrieveCustomer: vi.fn(async (id: string) => ({ id, deleted: false })),
    fulfilKit: vi.fn<(id: string) => Promise<void>>(async () => {}),
    addContact: vi.fn(async () => {}),
    captureServerEvent: vi.fn(async () => {}),
    captureException: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: m.after, connection: async () => {} }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (m.jar.has(name) ? { name, value: m.jar.get(name)! } : undefined),
    set: (name: string, value: string) => void m.jar.set(name, value),
    delete: (name: string) => void m.jar.delete(name),
  }),
}));
vi.mock("@/lib/env", () => ({
  env: { stripeSecretKey: "sk_test_unit", stripeWebhookSecret: "whsec_unit", authSecret: "unit-auth-secret" },
  forceMock: false,
  isStripeMock: () => false,
  isEmailMock: () => true,
  deploymentUrl: () => "http://x",
  siteUrl: () => "http://x",
}));
vi.mock("stripe", () => {
  class StripeInvalidRequestError extends Error {}
  return {
    default: class {
      static errors = { StripeInvalidRequestError };
      checkout = { sessions: { create: m.createSession, retrieve: m.retrieveSession } };
      promotionCodes = { list: async () => ({ data: [{ id: "promo_launch14" }] }) };
      customers = { retrieve: m.retrieveCustomer };
      // Signature checks are Stripe's job; the test body is the event itself.
      webhooks = { constructEvent: (body: string) => JSON.parse(body) };
    },
  };
});
vi.mock("@/lib/store", () => ({
  store: () => ({
    get: async (key: string) => m.kv.get(key) ?? null,
    set: async (key: string, value: unknown) => void m.kv.set(key, structuredClone(value)),
    getDel: async (key: string) => {
      const value = m.kv.get(key) ?? null;
      m.kv.delete(key);
      return value;
    },
    incr: async (key: string) => {
      const value = ((m.kv.get(key) as number | undefined) ?? 0) + 1;
      m.kv.set(key, value);
      return value;
    },
    sAdd: async (key: string, member: string) => void m.sets.set(key, (m.sets.get(key) ?? new Set()).add(member)),
    sRem: async (key: string, member: string) => void m.sets.get(key)?.delete(member),
    sMembers: async (key: string) => [...(m.sets.get(key) ?? [])],
  }),
  storeKind: () => "memory",
}));
vi.mock("@/lib/observability", async (importOriginal) => ({ ...(await importOriginal<object>()), captureException: m.captureException, captureMessage: vi.fn() }));
vi.mock("@/lib/analytics-server", () => ({
  captureServerEvent: m.captureServerEvent,
  eventUuid: (seed: string) => `uuid:${seed}`,
  resolveDistinctId: (id: unknown) => (typeof id === "string" ? id : "server_x"),
}));
vi.mock("@/lib/fulfil", async (importOriginal) => ({ ...(await importOriginal<object>()), fulfilKit: m.fulfilKit }));
vi.mock("@/lib/audience", () => ({ isEmail: (v: unknown) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), addContact: m.addContact }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(), kitReadyEmail: vi.fn(), preorderEmail: vi.fn() }));
vi.mock("@/lib/generation", () => ({
  generateDraft: vi.fn(async () => ({ sections: {}, complete: false })),
  getDraft: async () => ({ sections: {}, complete: false }),
  assemble: () => null,
  copyDraft: vi.fn(),
}));
vi.mock("@/lib/copy", () => ({ launchChecklist: () => [], generatePreview: vi.fn() }));
vi.mock("@/lib/kit-tracing", () => ({ phase: (_name: string, _op: string, _attrs: unknown, fn: () => Promise<unknown>) => fn() }));
vi.mock("@/lib/ingest", () => ({ ingest: vi.fn() }));
vi.mock("@/lib/brief", () => ({ buildBrief: vi.fn(), sourceDigest: vi.fn() }));
vi.mock("@/lib/zip", () => ({ buildKitZip: vi.fn(), zipFileName: vi.fn() }));

const { POST: checkout } = await import("@/app/api/checkout/route");
const { POST: webhook } = await import("@/app/api/stripe/webhook/route");
const { GET: checkoutReturn } = await import("@/app/api/checkout/return/route");
const { completeLogin } = await import("@/lib/login");
const { encodeSession, ANON_KITS_COOKIE, SESSION_COOKIE } = await import("@/lib/auth");
const { listUserKitIds } = await import("@/lib/kits");
const { getStoredBillingCustomer } = await import("@/lib/billing");

const KIT_ID = "kitGuestCheckout01";
const BUYER = "buyer@example.com";

function seedKit(patch: Partial<Kit> = {}) {
  const kit = {
    id: KIT_ID,
    createdAt: new Date().toISOString(),
    status: "preview",
    source: { input: "sample", commitsAnalysed: 0, readmeFound: false, packageJsonFound: false, pageScraped: false, warnings: [] },
    brief: { name: "Snapshelf", oneLiner: "", audience: "", problem: "", features: [], proofPoints: [], stack: [], tone: "" },
    palette: { background: "", foreground: "", accent: "", accentForeground: "", muted: "", source: "default" },
    preview: { tagline: "t", xPost: "x" },
    digest: "",
    llm: "mock",
    paid: false,
    attempts: 0,
    attribution: { utm_source: "hn", utm_campaign: "launch" },
    ...patch,
  } satisfies Kit;
  m.kv.set(`kit:${KIT_ID}`, kit);
  return kit;
}

const kit = () => m.kv.get(`kit:${KIT_ID}`) as Kit;
const members = (key: string) => [...(m.sets.get(key) ?? [])];
const flush = () => Promise.all(m.pending.splice(0));
const logLines = () => (console.info as unknown as { mock: { calls: string[][] } }).mock.calls.map(([line]) => JSON.parse(line) as Record<string, unknown>);

let seq = 0;
function guestEvent(session: Record<string, unknown> = {}, type = "checkout.session.completed", sessionId = `cs_test_guest_${++seq}`) {
  return {
    id: `evt_guest_${++seq}`,
    type,
    livemode: false,
    data: {
      object: {
        id: sessionId,
        payment_status: "paid",
        amount_total: 1900,
        currency: "gbp",
        customer: "cus_guest",
        customer_details: { email: " Buyer@Example.com " },
        metadata: { product: "kit", kitId: KIT_ID, env: "development", ph_distinct_id: "ph_guest", price_id: "inline", logged_in: "0", utm_source: "hn" },
        ...session,
      },
    },
  };
}

async function deliver(event: object) {
  const res = await webhook(new Request("http://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=x" }, body: JSON.stringify(event) }));
  await flush();
  return res;
}

const postCheckout = (body: object, ip = "203.0.113.10") =>
  checkout(new Request("http://x/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) }));

const login = (email: string, next?: string) => completeLogin({ email, next, createdAt: new Date().toISOString() });

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.kv.clear();
  m.sets.clear();
  m.jar.clear();
  m.pending.length = 0;
  vi.clearAllMocks();
  seedKit();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("/api/checkout without a user", () => {
  it("creates a Checkout session with no customer or user id, lets Stripe collect the email, and keeps kit, UTM and LAUNCH14 metadata", async () => {
    const res = await postCheckout({ product: "kit", kitId: KIT_ID, analyticsId: "ph_guest", experiments: { exp_launch14_promo: "treatment" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_new", promo: "applied" });
    expect(m.createSession).toHaveBeenCalledTimes(1);
    const params = m.createSession.mock.calls[0]![0] as Record<string, unknown> & { metadata: Record<string, string>; payment_intent_data: { metadata: Record<string, string> } };
    expect(params.customer).toBeUndefined();
    expect(params.customer_email).toBeUndefined();
    expect(params.customer_creation).toBe("always");
    expect(params.discounts).toEqual([{ promotion_code: "promo_launch14" }]);
    expect(params.success_url).toBe("http://x/api/checkout/return?session_id={CHECKOUT_SESSION_ID}");
    expect(params.metadata).toMatchObject({ product: "kit", kitId: KIT_ID, logged_in: "0", ph_distinct_id: "ph_guest", utm_source: "hn", utm_campaign: "launch", promo_code: "LAUNCH14", exp_launch14_promo: "treatment" });
    expect(Object.keys(params.metadata).filter((k) => /user|email|owner/i.test(k))).toEqual([]);
    expect(params.payment_intent_data.metadata).toEqual(params.metadata);
    expect(m.retrieveCustomer).not.toHaveBeenCalled();
  });

  it("still ties a signed-in checkout to the account's Stripe customer", async () => {
    m.jar.set(SESSION_COOKIE, encodeSession(BUYER));
    m.kv.set(`user:${BUYER}:customer`, { customerId: "cus_account", updatedAt: "2026-01-01", source: "account" });

    const res = await postCheckout({ product: "kit", kitId: KIT_ID, analyticsId: "ph_1", experiments: {} });

    expect(res.status).toBe(200);
    const params = m.createSession.mock.calls[0]![0] as Record<string, unknown> & { metadata: Record<string, string> };
    expect(params.customer).toBe("cus_account");
    expect(params.customer_creation).toBeUndefined();
    expect(params.metadata).toMatchObject({ kitId: KIT_ID, logged_in: "1" });
  });

  it("sends a guest back to the kit page if it's already paid, and rate limits signed-out checkouts per IP", async () => {
    seedKit({ paid: true, status: "ready" });
    expect(await (await postCheckout({ product: "kit", kitId: KIT_ID })).json()).toEqual({ url: `/kit/${KIT_ID}` });

    seedKit();
    const ip = "198.51.100.77";
    for (let i = 0; i < 20; i++) expect((await postCheckout({ product: "kit", kitId: KIT_ID }, ip)).status).toBe(200);
    const limited = await postCheckout({ product: "kit", kitId: KIT_ID }, ip);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ code: "rate_limited" });
  });
});

describe("webhook: guest purchase ownership", () => {
  it("links the kit to an existing account by the normalised customer_details.email", async () => {
    m.kv.set(`user:${BUYER}:account`, { firstLoginAt: "2026-01-01", lastLoginAt: "2026-01-01" });
    const event = guestEvent();

    expect((await deliver(event)).status).toBe(200);

    expect(kit()).toMatchObject({ paid: true, ownerEmail: BUYER, paymentRef: event.data.object.id });
    expect(members(`user:${BUYER}:kits`)).toEqual([KIT_ID]);
    expect(members(`pending:${BUYER}:kits`)).toEqual([]);
    expect(m.fulfilKit).toHaveBeenCalledWith(KIT_ID);
    expect(logLines()).toEqual([expect.objectContaining({ event: "stripe.webhook", outcome: "fulfilled", ownership: "account" })]);
    expect(JSON.stringify(logLines())).not.toMatch(/example\.com|cus_guest/i);
  });

  it("recognises accounts from before login records by their kit index", async () => {
    m.sets.set(`user:${BUYER}:kits`, new Set(["olderKit000000001"]));
    await deliver(guestEvent());
    expect(members(`user:${BUYER}:kits`)).toEqual(["olderKit000000001", KIT_ID]);
    expect(logLines()[0]).toMatchObject({ ownership: "account" });
  });

  it("records a pending purchase keyed by normalised email when there's no account, visible to that email once signed in", async () => {
    await deliver(guestEvent());

    expect(kit()).toMatchObject({ paid: true, ownerEmail: BUYER, email: " Buyer@Example.com " });
    expect(members(`pending:${BUYER}:kits`)).toEqual([KIT_ID]);
    expect(members(`user:${BUYER}:kits`)).toEqual([]);
    expect(m.kv.get(`user:${BUYER}:account`)).toBeUndefined();
    expect(await listUserKitIds(BUYER)).toEqual([KIT_ID]);
    expect(logLines()[0]).toMatchObject({ outcome: "fulfilled", ownership: "pending" });
    // Purchase tracking and the buyer's customer still work for a guest.
    expect(m.captureServerEvent).toHaveBeenCalledWith("checkout_completed", expect.objectContaining({ properties: expect.objectContaining({ isLoggedIn: false, kitId: KIT_ID, utm_source: "hn" }) }));
    expect((await getStoredBillingCustomer(BUYER))?.customerId).toBe("cus_guest");
  });

  it("never replaces the Stripe customer an existing account already has", async () => {
    m.kv.set(`user:${BUYER}:account`, { firstLoginAt: "2026-01-01", lastLoginAt: "2026-01-01" });
    m.kv.set(`user:${BUYER}:customer`, { customerId: "cus_account", updatedAt: "2026-01-01", source: "account" });
    await deliver(guestEvent());
    expect((await getStoredBillingCustomer(BUYER))?.customerId).toBe("cus_account");
  });

  it("is idempotent across redelivery, the async-payment event and the return URL", async () => {
    const event = guestEvent();
    const sessionId = event.data.object.id;
    await deliver(event);
    const first = kit();

    const again = await deliver(event);
    expect(await again.json()).toMatchObject({ duplicate: true });
    await deliver(guestEvent({}, "checkout.session.async_payment_succeeded", sessionId));
    m.retrieveSession.mockResolvedValueOnce(event.data.object);
    await checkoutReturn(new Request(`http://x/api/checkout/return?session_id=${sessionId}`));

    expect(kit()).toMatchObject({ paid: true, paymentRef: sessionId, paidAt: first.paidAt, ownerEmail: BUYER });
    expect(members(`pending:${BUYER}:kits`)).toEqual([KIT_ID]);
    expect(m.captureServerEvent.mock.calls.filter(([name]) => name === "checkout_completed").map(([, p]) => (p as { uuid: string }).uuid)).toEqual([
      `uuid:checkout_completed:${sessionId}`,
      `uuid:checkout_completed:${sessionId}`,
    ]);
    expect(logLines().map((l) => l.outcome)).toEqual(["fulfilled", "duplicate", "fulfilled"]);
  });

  it("reports a failure to record the ownership and lets Stripe retry", async () => {
    const event = guestEvent();
    vi.spyOn(m.sets, "set").mockImplementationOnce(() => {
      throw new Error("KV command SADD failed with 503");
    });

    expect((await deliver(event)).status).toBe(500);
    expect(m.captureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ stage: "stripe.webhook.record", eventId: event.id }));
    expect(logLines()[0]).toMatchObject({ outcome: "record_failed" });

    expect((await deliver(event)).status).toBe(200);
    expect(members(`pending:${BUYER}:kits`)).toEqual([KIT_ID]);
  });
});

describe("claiming on magic-link login", () => {
  it("moves pending purchases into the account on first login, then later purchases go straight there", async () => {
    await deliver(guestEvent());

    const next = await login(BUYER, `/account/kits/${KIT_ID}`);

    expect(next).toBe(`/account/kits/${KIT_ID}`);
    expect(m.jar.get(SESSION_COOKIE)).toBeTruthy();
    expect(members(`user:${BUYER}:kits`)).toEqual([KIT_ID]);
    expect(members(`pending:${BUYER}:kits`)).toEqual([]);
    expect(m.kv.get(`user:${BUYER}:account`)).toMatchObject({ firstLoginAt: expect.any(String) });
    expect(kit().ownerEmail).toBe(BUYER);

    // Claiming again is a no-op.
    await login(BUYER);
    expect(members(`user:${BUYER}:kits`)).toEqual([KIT_ID]);

    // Now an account: the next guest purchase skips pending.
    const second = "kitGuestCheckout02";
    m.kv.set(`kit:${second}`, { ...kit(), id: second, paid: false, status: "preview", ownerEmail: undefined, paymentRef: undefined });
    await deliver(guestEvent({ metadata: { product: "kit", kitId: second, env: "development", logged_in: "0" } }));
    expect(members(`user:${BUYER}:kits`)).toEqual([KIT_ID, second]);
    expect(members(`pending:${BUYER}:kits`)).toEqual([]);
  });

  it("doesn't hand a guest's paid kit to a different email, even from the buyer's browser cookie", async () => {
    await deliver(guestEvent());
    m.jar.set(ANON_KITS_COOKIE, KIT_ID);

    await login("someone-else@example.com");

    expect(members("user:someone-else@example.com:kits")).toEqual([]);
    expect(await listUserKitIds("someone-else@example.com")).toEqual([]);
    expect(members(`pending:${BUYER}:kits`)).toEqual([KIT_ID]);
    expect(kit().ownerEmail).toBe(BUYER);
  });
});

describe("return URL", () => {
  it("sends a guest to the success page with the session id, and a signed-in buyer to their kit in /account", async () => {
    const event = guestEvent();
    m.retrieveSession.mockResolvedValue(event.data.object);
    const guest = await checkoutReturn(new Request(`http://x/api/checkout/return?session_id=${event.data.object.id}`));
    expect(guest.status).toBe(303);
    expect(guest.headers.get("location")).toBe(`http://x/checkout/success?kit=${KIT_ID}&session_id=${event.data.object.id}&aid=ph_guest`);

    m.retrieveSession.mockResolvedValue({ ...event.data.object, metadata: { ...event.data.object.metadata, logged_in: "1" } });
    m.jar.set(SESSION_COOKIE, encodeSession(BUYER));
    const signedIn = await checkoutReturn(new Request(`http://x/api/checkout/return?session_id=${event.data.object.id}`));
    expect(signedIn.headers.get("location")).toBe(`http://x/account/kits/${KIT_ID}?paid=1&aid=ph_guest`);
  });
});
