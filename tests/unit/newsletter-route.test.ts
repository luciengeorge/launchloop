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
const postJson = (body: Record<string, unknown>, extra: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/newsletter", { method: "POST", headers: { ...headers(), ...extra, "Content-Type": "application/json" }, body: JSON.stringify(body) }));
const postForm = (fields: Record<string, string>, extra: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/newsletter", { method: "POST", headers: { ...headers(), ...extra, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields) }));

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

  it("a plain form post from a QA-tagged page is is_test, from its Referer, like the JS path from its tab", async () => {
    const blog = "http://localhost/blog/how-to-launch-on-product-hunt";
    await postForm({ email: "qa-form@launchloop.dev", placement: "blog" }, { referer: `${blog}?qa=1` });
    await postForm({ email: "qa-utm@launchloop.dev", placement: "blog" }, { referer: `${blog}?utm_source=qa` });
    expect(captured().map((c) => c.properties)).toEqual([
      { placement: "blog", welcome: "sent", submitted: "form", is_test: true },
      { placement: "blog", welcome: "sent", submitted: "form", is_test: true },
    ]);
  });

  it("an untagged or foreign Referer leaves a form post untagged", async () => {
    await postForm({ email: "real@launchloop.dev", placement: "footer" }, { referer: "http://localhost/pricing" });
    await postForm({ email: "elsewhere@launchloop.dev", placement: "footer" }, { referer: "https://evil.example/?qa=1" });
    await postForm({ email: "noref@launchloop.dev", placement: "footer" });
    for (const c of captured()) expect(c.properties).not.toHaveProperty("is_test");
  });

  it("the JS path also honours a QA Referer, for a submit whose tab lost the flag", async () => {
    await postJson({ email: "qa-js@launchloop.dev", placement: "preview", analyticsId: PAGE_ID }, { referer: "http://localhost/kit/abc?qa=1" });
    expect(captured()[0].properties).toMatchObject({ submitted: "js", is_test: true });
  });

  it("Resend's test addresses are is_test on both paths, and the address itself never reaches analytics", async () => {
    await postJson({ email: "delivered@resend.dev", placement: "footer", analyticsId: PAGE_ID });
    await postForm({ email: "Bounced+run-7@Resend.dev", placement: "blog" });
    expect(captured().map((c) => [c.properties.submitted, c.properties.is_test])).toEqual([
      ["js", true],
      ["form", true],
    ]);
    expect(JSON.stringify(captured())).not.toMatch(/resend|delivered|bounced|@/i);
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
