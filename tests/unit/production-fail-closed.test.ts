import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type * as UndiciModule from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

/**
 * env.ts reads the environment when it loads, so every case stubs the env first and then imports fresh modules.
 * VERCEL_ENV is the switch; KV vars are blanked so a developer's .env can't change the outcome.
 */
function deployment(vercelEnv: string, extra: Record<string, string> = {}) {
  vi.resetModules();
  for (const name of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "INGEST_ALLOW_PRIVATE", "STRIPE_SECRET_KEY", "MOCK_MODE"]) vi.stubEnv(name, "");
  vi.stubEnv("VERCEL_ENV", vercelEnv);
  for (const [name, value] of Object.entries(extra)) vi.stubEnv(name, value);
}

const observability = () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn(), normaliseErrorMessage: (e: unknown) => String(e) });

let mem: MemoryStore;
beforeEach(() => {
  mem = new MemoryStore();
});
afterEach(() => {
  vi.doUnmock("@/lib/store");
  vi.doUnmock("@/lib/observability");
  vi.doUnmock("undici");
  vi.doUnmock("node:dns/promises");
});

describe("free previews without a KV store", () => {
  async function gate() {
    vi.doMock("@/lib/store", () => ({ store: () => mem }));
    vi.doMock("@/lib/observability", observability);
    const { freePreviewGate } = await import("@/lib/rate-limit");
    return (input: string) => freePreviewGate(new Request("http://localhost/api/kits", { method: "POST", headers: { "x-forwarded-for": "203.0.113.7" } }), input);
  }

  it("production refuses with busy and a retry CTA, before counting anything (the sample too)", async () => {
    deployment("production");
    const run = await gate();
    for (const input of ["https://github.com/acme/app", "sample"]) {
      const { refused } = await run(input);
      expect(refused?.status).toBe(503);
      const body = (await refused!.json()) as { code: string; error: string; fix: string };
      expect(body).toMatchObject({ code: "busy", error: "LaunchLoop is very busy right now, try again in a bit." });
      expect(body.fix).toMatch(/Retry in a few minutes/);
      expect(`${body.error} ${body.fix}`).not.toMatch(/\u2014/);
    }
    expect(mem.keys()).toEqual([]);
  });

  it("production with KV configured goes ahead", async () => {
    deployment("production", { KV_REST_API_URL: "https://kv.example.test", KV_REST_API_TOKEN: "unit-token" });
    const { refused } = await (await gate())("https://github.com/acme/app");
    expect(refused).toBeNull();
  });

  it.each(["preview", ""])("VERCEL_ENV=%j without KV is unchanged: the preview goes ahead on the file store", async (vercelEnv) => {
    deployment(vercelEnv);
    const { refused } = await (await gate())("https://github.com/acme/app");
    expect(refused).toBeNull();
  });
});

describe("store() without KV", () => {
  it("throws in production instead of falling back to files in /tmp", async () => {
    deployment("production");
    const { store } = await import("@/lib/store");
    expect(() => store()).toThrow("KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) must be set in production");
  });

  it.each(["preview", ""])("VERCEL_ENV=%j still uses the file store", async (vercelEnv) => {
    deployment(vercelEnv, { DATA_DIR: mkdtempSync(path.join(tmpdir(), "ll-store-")) });
    const { store, storeKind } = await import("@/lib/store");
    expect(storeKind()).toBe("file");
    await store().set("k", 1);
    expect(await store().get("k")).toBe(1);
  });
});

describe("POST /api/checkout/mock", () => {
  async function route() {
    const m = { getKit: vi.fn(async (id: string) => ({ id, attribution: undefined })), recordPayment: vi.fn(async () => ({ ownership: "guest" })), fulfilKit: vi.fn(async () => {}) };
    vi.doMock("next/server", () => ({ after: vi.fn() }));
    vi.doMock("@/lib/observability", observability);
    vi.doMock("@/lib/store", () => ({ store: () => mem }));
    vi.doMock("@/lib/auth", () => ({ getSession: async () => null }));
    vi.doMock("@/lib/analytics-server", () => ({ captureServerEvent: vi.fn(), resolveDistinctId: () => "server_unit" }));
    vi.doMock("@/lib/kits", () => ({ getKit: m.getKit }));
    vi.doMock("@/lib/fulfil", () => ({ fulfilKit: m.fulfilKit, recordPayment: m.recordPayment }));
    const { POST } = await import("@/app/api/checkout/mock/route");
    const post = () => POST(new Request("http://localhost/api/checkout/mock", { method: "POST", body: JSON.stringify({ product: "kit", kitId: "kit_unit", email: "buyer@example.com" }) }));
    return { post, m };
  }

  afterEach(() => {
    for (const mod of ["next/server", "@/lib/auth", "@/lib/analytics-server", "@/lib/kits", "@/lib/fulfil"]) vi.doUnmock(mod);
  });

  it("is a 404 in production even without Stripe keys, and marks nothing paid", async () => {
    deployment("production");
    const { post, m } = await route();
    const res = await post();
    expect(res.status).toBe(404);
    expect(m.getKit).not.toHaveBeenCalled();
    expect(m.recordPayment).not.toHaveBeenCalled();
    expect(m.fulfilKit).not.toHaveBeenCalled();
  });

  it.each(["preview", ""])("still works with VERCEL_ENV=%j and no Stripe key (e2e mock mode)", async (vercelEnv) => {
    deployment(vercelEnv);
    const { post, m } = await route();
    const res = await post();
    expect(res.status).toBe(200);
    expect(m.recordPayment).toHaveBeenCalledWith(expect.objectContaining({ kitId: "kit_unit", email: "buyer@example.com" }));
  });
});

describe("the /checkout/mock page", () => {
  type El = { type: (props: unknown) => unknown; props: { children: El; searchParams?: unknown } };

  /** Renders the page down to its async MockCheckout component and runs it, as the server would. */
  async function renderMockCheckout() {
    vi.doMock("@/components/mock-checkout-form", () => ({ MockCheckoutForm: () => null }));
    vi.doMock("@/lib/kits", () => ({ getKit: async (id: string) => ({ id, brief: { name: "Acme" } }) }));
    const { default: MockCheckoutPage } = await import("@/app/checkout/mock/page");
    const page = MockCheckoutPage({ searchParams: Promise.resolve({ product: "kit", kitId: "kit_unit" }) } as never) as unknown as El;
    const inner = page.props.children.props.children;
    return inner.type(inner.props);
  }

  afterEach(() => {
    vi.doUnmock("@/components/mock-checkout-form");
    vi.doUnmock("@/lib/kits");
  });

  it("is a 404 in production even without Stripe keys", async () => {
    deployment("production");
    await expect(renderMockCheckout()).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });

  it("in production the page calls notFound() at its top level, before any Suspense boundary streams a 200 shell", async () => {
    deployment("production");
    vi.doMock("@/components/mock-checkout-form", () => ({ MockCheckoutForm: () => null }));
    const { default: MockCheckoutPage } = await import("@/app/checkout/mock/page");
    expect(() => MockCheckoutPage({ searchParams: Promise.resolve({ product: "kit" }) } as never)).toThrow(expect.objectContaining({ digest: expect.stringContaining("404") }));
  });

  it("the title never says 'Test checkout' in production", async () => {
    deployment("production");
    vi.doMock("@/components/mock-checkout-form", () => ({ MockCheckoutForm: () => null }));
    const { generateMetadata } = await import("@/app/checkout/mock/page");
    expect(generateMetadata()).toEqual({ title: "Page not found", robots: { index: false, follow: false } });
  });

  it.each(["preview", ""])("VERCEL_ENV=%j keeps the 'Test checkout' title", async (vercelEnv) => {
    deployment(vercelEnv);
    vi.doMock("@/components/mock-checkout-form", () => ({ MockCheckoutForm: () => null }));
    const { generateMetadata } = await import("@/app/checkout/mock/page");
    expect(generateMetadata()).toMatchObject({ title: "Test checkout" });
  });

  it.each(["preview", ""])("still renders with VERCEL_ENV=%j and no Stripe key", async (vercelEnv) => {
    deployment(vercelEnv);
    await expect(renderMockCheckout()).resolves.toBeTruthy();
  });
});

describe("starting checkout without a Stripe key", () => {
  const request = { product: "kit" as const, origin: "http://localhost", kitId: "kit_unit", analyticsId: "aid_unit", isLoggedIn: false, experiments: {}, fallbacks: [] };

  it("createCheckoutUrl throws CheckoutUnavailableError in production instead of pointing at /checkout/mock", async () => {
    deployment("production");
    vi.doMock("@/lib/observability", observability);
    const { createCheckoutUrl, CheckoutUnavailableError } = await import("@/lib/payments");
    await expect(createCheckoutUrl(request)).rejects.toBeInstanceOf(CheckoutUnavailableError);
  });

  it.each(["preview", ""])("createCheckoutUrl still sends VERCEL_ENV=%j to the mock checkout", async (vercelEnv) => {
    deployment(vercelEnv);
    vi.doMock("@/lib/observability", observability);
    const { createCheckoutUrl } = await import("@/lib/payments");
    expect((await createCheckoutUrl(request)).url).toMatch(/^\/checkout\/mock\?product=kit&/);
  });

  async function checkoutRoute() {
    const captureException = vi.fn();
    vi.doMock("next/server", () => ({ after: vi.fn() }));
    vi.doMock("@/lib/observability", () => ({ ...observability(), captureException }));
    vi.doMock("@/lib/store", () => ({ store: () => mem }));
    vi.doMock("@/lib/auth", () => ({ getSession: async () => null }));
    vi.doMock("@/lib/analytics-server", () => ({ captureServerEvent: vi.fn(), resolveDistinctId: () => "server_unit" }));
    vi.doMock("@/lib/kits", () => ({ getKit: async (id: string) => ({ id, paid: false, attribution: undefined }) }));
    vi.doMock("@/lib/kit-promo", () => ({ resolveKitPromo: async () => undefined }));
    vi.doMock("@/lib/generation", () => ({ generateDraft: async () => ({}) }));
    vi.doMock("@/lib/billing", () => ({ ensureStripeCustomer: vi.fn() }));
    const { POST } = await import("@/app/api/checkout/route");
    const post = () => POST(new Request("http://localhost/api/checkout", { method: "POST", headers: { "x-forwarded-for": "203.0.113.8" }, body: JSON.stringify({ product: "kit", kitId: "kit_unit" }) }));
    return { post, captureException };
  }

  afterEach(() => {
    for (const mod of ["next/server", "@/lib/auth", "@/lib/analytics-server", "@/lib/kits", "@/lib/kit-promo", "@/lib/generation", "@/lib/billing"]) vi.doUnmock(mod);
  });

  it("/api/checkout answers production buyers with a retry and contact CTA, not a dead end, and reports it", async () => {
    deployment("production", { KV_REST_API_URL: "https://kv.example.test", KV_REST_API_TOKEN: "unit-token" });
    const { post, captureException } = await checkoutRoute();
    const res = await post();
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; code: string; url?: string };
    expect(body.code).toBe("checkout_unavailable");
    expect(body.url).toBeUndefined();
    expect(body.error).toMatch(/Your preview is saved/);
    expect(body.error).toMatch(/try again shortly/);
    expect(body.error).toMatch(/hello@launchloop\.dev/);
    expect(body.error).not.toMatch(/\u2014/);
    expect(captureException).toHaveBeenCalledWith(expect.objectContaining({ name: "CheckoutUnavailableError" }), expect.objectContaining({ stage: "api.checkout" }));
  });

  it.each(["preview", ""])("/api/checkout still returns the mock checkout URL with VERCEL_ENV=%j", async (vercelEnv) => {
    deployment(vercelEnv);
    const { post } = await checkoutRoute();
    const res = await post();
    expect(res.status).toBe(200);
    expect(((await res.json()) as { url: string }).url).toMatch(/^\/checkout\/mock\?product=kit&/);
  });
});

describe("INGEST_ALLOW_PRIVATE", () => {
  async function safeFetchWithFakeNetwork() {
    const fetch = vi.fn(async () => new Response("<html>ok</html>", { status: 200, headers: { "content-type": "text/html" } }));
    vi.doMock("undici", async () => ({ ...(await vi.importActual<typeof UndiciModule>("undici")), fetch }));
    vi.doMock("node:dns/promises", () => ({ lookup: vi.fn(), default: { lookup: vi.fn() } }));
    const { safeFetch } = await import("@/lib/ingest/safe-fetch");
    return { safeFetch, fetch };
  }

  it("is ignored in production: private addresses stay blocked", async () => {
    deployment("production", { INGEST_ALLOW_PRIVATE: "true" });
    const { safeFetch, fetch } = await safeFetchWithFakeNetwork();
    for (const url of ["http://127.0.0.1:3419/", "http://169.254.169.254/latest/meta-data/", "http://localhost/"]) {
      await expect(safeFetch(url)).rejects.toMatchObject({ code: "site_blocked" });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["preview", ""])("still lets VERCEL_ENV=%j reach local fixtures", async (vercelEnv) => {
    deployment(vercelEnv, { INGEST_ALLOW_PRIVATE: "true" });
    const { safeFetch, fetch } = await safeFetchWithFakeNetwork();
    await expect(safeFetch("http://127.0.0.1:3419/")).resolves.toMatchObject({ status: 200 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
