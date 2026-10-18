import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({ ANON_KITS_COOKIE: "ll_anon_kits", getSession: async () => null, readAnonKits: () => [], secureCookies: () => false }));
vi.mock("@/lib/generation", () => ({ speculateDraft: vi.fn(async () => "capped") }));
vi.mock("@/lib/kits", () => ({
  newId: () => "kitid_0123456789abcd",
  createKit: vi.fn(async (_url: string, _onStep: unknown, opts: { id: string }) => ({ id: opts.id })),
}));

const { captureExceptionThrottled } = await import("@/lib/observability");
const { createKit } = await import("@/lib/kits");
const { POST } = await import("@/app/api/kits/route");

const post = (ip: string, url = "https://github.com/acme/app") =>
  POST(new Request("http://localhost/api/kits", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ url }) }));

let mem: MemoryStore;

beforeEach(() => {
  mem = new MemoryStore();
  kv.store = mem;
  vi.useFakeTimers({ toFake: ["Date"] });
  // 10 minutes into a UTC day, so the hourly and daily windows line up predictably.
  vi.setSystemTime(new Date("2026-10-18T00:10:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/kits rate limit", () => {
  it("the 6th valid request from one IP within the hour gets 429 rate_limited with Retry-After", async () => {
    for (let i = 0; i < 5; i++) expect((await post("203.0.113.10")).status).toBe(201);

    const res = await post("203.0.113.10");
    expect(res.status).toBe(429);
    const body = await res.json();
    // Resets at the top of the hour: 50 minutes from 00:10.
    expect(body).toMatchObject({ code: "rate_limited", error: "You've used your free previews for now.", retryAfterSeconds: 50 * 60 });
    expect(body.fix).toContain("Try again in 50 min");
    expect(res.headers.get("Retry-After")).toBe("3000");
    expect(createKit).toHaveBeenCalledTimes(5);

    expect((await post("203.0.113.11")).status).toBe(201);
  });

  it("the 21st valid request in a UTC day is limited even when the hour has room", async () => {
    for (let hour = 0; hour < 4; hour++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 9, 18, hour, 10)));
      for (let i = 0; i < 5; i++) expect((await post("203.0.113.20")).status).toBe(201);
    }
    vi.setSystemTime(new Date("2026-10-18T04:10:00Z"));
    const res = await post("203.0.113.20");
    expect(res.status).toBe(429);
    const body = await res.json();
    // Resets at UTC midnight: 19h50m away.
    expect(body.retryAfterSeconds).toBe(19 * 3600 + 50 * 60);
    expect(res.headers.get("Retry-After")).toBe(String(19 * 3600 + 50 * 60));
    expect(body.fix).toContain("Try again in 20 hours");

    vi.setSystemTime(new Date("2026-10-19T00:00:01Z"));
    expect((await post("203.0.113.20")).status).toBe(201);
  });

  it("invalid URLs and the sample don't use up the budget", async () => {
    for (let i = 0; i < 10; i++) expect((await post("203.0.113.30", "not a url")).status).toBe(422);
    for (let i = 0; i < 10; i++) expect((await post("203.0.113.30", "sample")).status).toBe(201);
    for (let i = 0; i < 5; i++) expect((await post("203.0.113.30")).status).toBe(201);
    expect((await post("203.0.113.30")).status).toBe(429);
  });

  it("doesn't fail open when Upstash errors: 503 busy, no generation, reported to Sentry", async () => {
    mem.failing = true;
    const res = await post("203.0.113.40");
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("busy");
    expect(createKit).not.toHaveBeenCalled();
    expect(captureExceptionThrottled).toHaveBeenCalledWith("rate-limit.store", expect.any(Error), { stage: "rate-limit.store" });
  });
});
