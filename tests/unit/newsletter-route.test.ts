import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/email", () => ({ resend: () => null, sendEmail: vi.fn(), newsletterWelcomeEmail: vi.fn(async () => ({})) }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));
// Outside a request scope next/server's after() throws; run the callback straight away instead.
vi.mock("next/server", async (actual) => ({ ...(await actual<typeof import("next/server")>()), after: (fn: () => unknown) => void fn() }));
vi.mock("@/lib/analytics-server", async (actual) => ({ ...(await actual<typeof import("@/lib/analytics-server")>()), captureServerEvent: vi.fn(async () => {}) }));

const { captureServerEvent } = await import("@/lib/analytics-server");
const { POST } = await import("@/app/api/newsletter/route");

const PAGE_ID = "0a4e365a-c22b-4d4f-9a39-0d1b2c3d4e5f";
let ip = 0;
const headers = () => ({ "x-forwarded-for": `198.51.100.${++ip}` });
const postJson = (body: Record<string, unknown>) =>
  POST(new Request("http://localhost/api/newsletter", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(body) }));
const postForm = (fields: Record<string, string>) =>
  POST(new Request("http://localhost/api/newsletter", { method: "POST", headers: { ...headers(), "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields) }));

const captured = () =>
  vi.mocked(captureServerEvent).mock.calls.map(([event, params]) => ({ event, ...params, properties: params.properties as Record<string, unknown> }));

beforeEach(() => {
  kv.store = new MemoryStore();
});

describe("POST /api/newsletter records newsletter_subscribed on the server", () => {
  it("once per successful JS signup, on the page's id, with placement and welcome, and never the email", async () => {
    const res = await postJson({ email: "Maker@LaunchLoop.dev", placement: "blog", analyticsId: PAGE_ID, isWebdriver: false });
    expect(await res.json()).toEqual({ ok: true, welcome: "sent" });
    expect(captured()).toEqual([
      { event: "newsletter_subscribed", distinctId: PAGE_ID, properties: { placement: "blog", welcome: "sent", submitted: "js", is_webdriver: false } },
    ]);
    expect(JSON.stringify(captured())).not.toMatch(/@|maker/i);
  });

  it("a repeat signup is still one event, with welcome: existing", async () => {
    await postJson({ email: "maker@launchloop.dev", placement: "footer", analyticsId: PAGE_ID });
    await postJson({ email: "MAKER@launchloop.dev", placement: "preview", analyticsId: PAGE_ID });
    expect(captured().map((c) => [c.properties.placement, c.properties.welcome])).toEqual([
      ["footer", "sent"],
      ["preview", "existing"],
    ]);
  });

  it("keeps the QA and automation tags the browser sent, so test traffic stays filterable", async () => {
    await postJson({ email: "qa@launchloop.dev", placement: "footer", analyticsId: PAGE_ID, isTest: true, isWebdriver: true });
    expect(captured()[0].properties).toEqual({ placement: "footer", welcome: "sent", submitted: "js", is_webdriver: true, is_test: true });
  });

  it("without a usable page id (or a junk one) it falls back to a server id", async () => {
    await postJson({ email: "a@launchloop.dev", placement: "footer" });
    await postJson({ email: "b@launchloop.dev", placement: "footer", analyticsId: "maker@launchloop.dev" });
    for (const c of captured()) expect(c.distinctId).toMatch(/^server_[0-9a-f-]{36}$/);
  });

  it("a plain form post (no JavaScript) counts too, marked submitted: form, and ignores ids and tags in the form", async () => {
    const res = await postForm({ email: "nojs@launchloop.dev", placement: "blog", next: "/blog/how-to-launch-on-product-hunt", analyticsId: PAGE_ID, isTest: "true" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/blog/how-to-launch-on-product-hunt?subscribed=1&from=blog#newsletter");
    expect(captured()).toHaveLength(1);
    expect(captured()[0].distinctId).toMatch(/^server_/);
    expect(captured()[0].properties).toEqual({ placement: "blog", welcome: "sent", submitted: "form" });
  });

  it("an unknown placement is recorded as footer, like the stored contact", async () => {
    await postJson({ email: "c@launchloop.dev", placement: "sidebar", analyticsId: PAGE_ID });
    expect(captured()[0].properties.placement).toBe("footer");
  });

  it("nothing is recorded when the signup fails", async () => {
    expect((await postJson({ email: "not-an-email", placement: "blog", analyticsId: PAGE_ID })).status).toBe(400);
    const limited = () =>
      POST(new Request("http://localhost/api/newsletter", { method: "POST", headers: { "x-forwarded-for": "203.0.113.9", "Content-Type": "application/json" }, body: "{}" }));
    for (let i = 0; i < 10; i++) await limited();
    expect((await limited()).status).toBe(429);
    (kv.store as MemoryStore).failing = true;
    expect((await postJson({ email: "down@launchloop.dev", placement: "blog", analyticsId: PAGE_ID })).status).toBe(500);
    expect(captured()).toEqual([]);
  });
});
