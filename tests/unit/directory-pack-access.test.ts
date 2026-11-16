import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseDirectories } from "@/lib/directory-csv";

const m = vi.hoisted(() => {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    env: { stripeSecretKey: "sk_test_unit", stripeWebhookSecret: "whsec_unit", authSecret: "unit-auth-secret", llmProvider: "mock", stripeDirectoryPackPriceId: undefined as string | undefined },
    after: vi.fn((fn: () => unknown) => void pending.push(Promise.resolve().then(fn))),
    createSession: vi.fn<(params: Record<string, unknown>) => Promise<{ id: string; url: string }>>(async () => ({ id: "cs_test_pack", url: "https://checkout.stripe.com/c/pay/cs_test_pack" })),
    retrievePrice: vi.fn(async (id: string) => ({ id, type: "one_time" })),
    retrieveSession: vi.fn<(id: string) => Promise<Record<string, unknown>>>(),
    sendEmail: vi.fn(async () => ({ id: "mock", mock: true })),
    captureServerEvent: vi.fn(async () => {}),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: m.after, connection: async () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));
vi.mock("@/lib/env", () => ({
  env: m.env,
  forceMock: false,
  isStripeMock: () => false,
  isEmailMock: () => true,
  deploymentUrl: () => "https://preview.launchloop.dev",
  siteUrl: () => "https://launchloop.dev",
}));
vi.mock("stripe", () => {
  class StripeInvalidRequestError extends Error {}
  return {
    default: class {
      static errors = { StripeInvalidRequestError };
      checkout = { sessions: { create: m.createSession, retrieve: m.retrieveSession } };
      prices = { retrieve: m.retrievePrice };
      webhooks = { constructEvent: (body: string) => JSON.parse(body) };
    },
  };
});
vi.mock("@/lib/store", async () => {
  const { MemoryStore } = await import("./memory-store");
  const memory = new MemoryStore();
  return { store: () => memory, storeKind: () => "memory" };
});
vi.mock("@/lib/analytics-server", () => ({ captureServerEvent: m.captureServerEvent, eventUuid: (seed: string) => `uuid:${seed}`, resolveDistinctId: () => "ph_1" }));
vi.mock("@/lib/email", async (importOriginal) => ({ ...(await importOriginal<object>()), sendEmail: m.sendEmail }));
vi.mock("@/lib/observability", async (importOriginal) => ({ ...(await importOriginal<object>()), captureException: vi.fn(), captureMessage: vi.fn() }));

const { POST: checkout } = await import("@/app/api/checkout/route");
const { POST: webhook } = await import("@/app/api/stripe/webhook/route");
const { GET: checkoutReturn } = await import("@/app/api/checkout/return/route");
const { GET: downloadCsv } = await import("@/app/api/directory-pack/[id]/csv/route");
const { POST: writeListings } = await import("@/app/api/directory-pack/[id]/listings/route");

const ROWS = parseDirectories(readFileSync(path.join(process.cwd(), "data/directory-pack/directories.csv"), "utf8"));
const PACK_ID = "packUnitTest0123456789";
const flush = () => Promise.all(m.pending.splice(0));
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const csvFor = (id: string) => downloadCsv(new Request(`http://x/api/directory-pack/${id}/csv`), params(id));
const listingsFor = (id: string, body: unknown) =>
  writeListings(new Request(`http://x/api/directory-pack/${id}/listings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), params(id));
const PRODUCT = { name: "Snapshelf", url: "https://snapshelf.app/", oneLiner: "Find any screenshot on your Mac by the words in it", audience: "designers", features: "Offline search\nTags by app" };

let seq = 0;
function paidEvent(metadata: Record<string, string> = {}) {
  seq += 1;
  return {
    id: `evt_pack_${seq}`,
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: `cs_test_pack_${seq}`,
        payment_status: "paid",
        amount_total: 2900,
        currency: "gbp",
        customer_details: { email: "buyer@example.com" },
        metadata: { product: "directoryPack", packId: PACK_ID, env: "development", ph_distinct_id: "ph_1", price_id: "price_pack_test", logged_in: "0", ...metadata },
      },
    },
  };
}
const deliver = async (event: object) => {
  const res = await webhook(new Request("http://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=x" }, body: JSON.stringify(event) }));
  await flush();
  return res;
};

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  m.env.stripeDirectoryPackPriceId = undefined;
});
afterEach(() => flush());

describe("without a paid unlock", () => {
  it.each([["an unknown pack id", "packNeverPaid012345678"], ["a malformed id", "../kit:abc"]])("the CSV and listings APIs answer 403 for %s, with no directory data", async (_label, id) => {
    for (const res of [await csvFor(id), await listingsFor(id, PRODUCT)]) {
      expect(res.status).toBe(403);
      const body = await res.text();
      for (const row of ROWS) expect(body).not.toContain(row.notes);
      expect(body).not.toContain("rank,name");
    }
  });
});

describe("checkout", () => {
  const start = () => checkout(new Request("http://x/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.20" }, body: JSON.stringify({ product: "directoryPack", analyticsId: "ph_1" }) }));

  it("is not on sale without STRIPE_DIRECTORY_PACK_PRICE_ID: a 503, and Stripe is never called", async () => {
    const res = await start();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "not_on_sale" });
    expect(m.createSession).not.toHaveBeenCalled();
  });

  it("with the price id set, starts a one-off Checkout for that price, carrying a fresh pack id", async () => {
    m.env.stripeDirectoryPackPriceId = "price_pack_test";
    const res = await start();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_pack", promo: "none" });
    const params = m.createSession.mock.calls[0][0] as { mode: string; line_items: unknown[]; metadata: Record<string, string>; cancel_url: string };
    expect(params.mode).toBe("payment");
    expect(params.line_items).toEqual([{ price: "price_pack_test", quantity: 1 }]);
    expect(params.metadata).toMatchObject({ product: "directoryPack", price_id: "price_pack_test" });
    expect(params.metadata.packId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(params.metadata).not.toHaveProperty("kitId");
    expect(params.cancel_url).toContain("/directory-pack?checkout=cancelled");
  });
});

describe("after payment", () => {
  it("the webhook unlocks the pack: the CSV has every row and column, and the buyer is emailed the private link once", async () => {
    expect((await deliver(paidEvent())).status).toBe(200);
    const res = await csvFor(PACK_ID);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(parseDirectories(await res.text())).toEqual(ROWS);

    await deliver(paidEvent());
    expect(m.sendEmail).toHaveBeenCalledTimes(1);
    expect(m.sendEmail.mock.calls[0][0]).toMatchObject({ to: "buyer@example.com", text: expect.stringContaining(`https://preview.launchloop.dev/directory-pack/access/${PACK_ID}`) });
  });

  it("the Checkout return verifies the session and sends the buyer to the pack", async () => {
    m.retrieveSession.mockResolvedValueOnce(paidEvent({ packId: "packReturnRoute0123456" }).data.object);
    const res = await checkoutReturn(new Request("http://x/api/checkout/return?session_id=cs_test_pack_return"));
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/directory-pack/access/packReturnRoute0123456");
    expect((await csvFor("packReturnRoute0123456")).status).toBe(200);
  });

  it("listings: details in once, copy out per directory; the CSV then carries the UTM link and copy", async () => {
    await deliver(paidEvent());
    expect((await listingsFor(PACK_ID, { ...PRODUCT, url: "not a url" })).status).toBe(400);
    expect((await listingsFor(PACK_ID, PRODUCT)).status).toBe(200);
    const csv = await (await csvFor(PACK_ID)).text();
    const [header, first] = csv.split("\r\n");
    expect(header.endsWith(",your_link,tagline,description")).toBe(true);
    expect(first).toContain(`https://snapshelf.app/?utm_source=${ROWS[0].utm_source}&utm_medium=directory`);
  });
});
