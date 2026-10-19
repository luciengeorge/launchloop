import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({ ANON_KITS_COOKIE: "ll_anon_kits", getSession: async () => null, readAnonKits: () => [], secureCookies: () => false }));
vi.mock("@/lib/generation", () => ({ speculateDraft: vi.fn(async () => "capped") }));
const okKit = async (_url: string, _onStep: unknown, opts: { id: string }) => ({ id: opts.id });
vi.mock("@/lib/kits", () => ({
  newId: () => "kitid_0123456789abcd",
  createKit: vi.fn(okKit),
  markKitPending: vi.fn(async () => {}),
  markKitFailed: vi.fn(async () => {}),
}));

const { captureExceptionThrottled } = await import("@/lib/observability");
const { createKit } = await import("@/lib/kits");
const { IngestError } = await import("@/lib/ingest");
const { LlmError } = await import("@/lib/llm");
const { POST } = await import("@/app/api/kits/route");

const post = (ip: string, url = "https://github.com/acme/app", accept = "application/json") =>
  POST(
    new Request("http://localhost/api/kits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: accept, "x-forwarded-for": ip },
      body: JSON.stringify({ url }),
    }),
  );

/** Like createKit: a missing repo fails while reading it; "after-brief" fails once the brief (a model call) is written. */
const failingKit = async (url: string, onStep: (step: string) => void = () => {}, opts: { id: string }) => {
  if (url.includes("private")) {
    onStep("repo");
    throw new IngestError("404 from GitHub", "repo_not_found");
  }
  if (url.includes("ai-down")) {
    onStep("repo");
    onStep("brief");
    throw new LlmError("gateway down");
  }
  if (url.includes("after-brief")) {
    onStep("repo");
    onStep("brief");
    onStep("copy");
    throw new LlmError("gateway down");
  }
  return { id: opts.id };
};

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

  it("private or missing repos don't use up the budget (the reported session: 1 private, 3 previews, then 2 more)", async () => {
    vi.mocked(createKit).mockImplementation(failingKit as typeof createKit);
    expect((await post("203.0.113.50")).status).toBe(201);
    const failed = await post("203.0.113.50", "https://github.com/acme/private-app");
    expect(failed.status).toBe(422);
    expect((await failed.json()).code).toBe("repo_not_found");
    for (let i = 0; i < 4; i++) expect((await post("203.0.113.50")).status).toBe(201);
    expect((await post("203.0.113.50")).status).toBe(429);
  });

  it("streamed previews that fail before any model call are refunded too", async () => {
    vi.mocked(createKit).mockImplementation(failingKit as typeof createKit);
    for (let i = 0; i < 3; i++) {
      const res = await post("203.0.113.51", "https://github.com/acme/private-app", "application/x-ndjson");
      expect(await res.text()).toContain('"code":"repo_not_found"');
    }
    for (let i = 0; i < 5; i++) expect((await post("203.0.113.51")).status).toBe(201);
    expect((await post("203.0.113.51")).status).toBe(429);
  });

  it("an AI outage before the brief is written is refunded", async () => {
    vi.mocked(createKit).mockImplementation(failingKit as typeof createKit);
    for (let i = 0; i < 3; i++) expect((await post("203.0.113.52", "https://github.com/acme/ai-down")).status).toBe(503);
    for (let i = 0; i < 5; i++) expect((await post("203.0.113.52")).status).toBe(201);
    expect((await post("203.0.113.52")).status).toBe(429);
  });

  it("a run that fails after a model call completed still counts", async () => {
    vi.mocked(createKit).mockImplementation(failingKit as typeof createKit);
    for (let i = 0; i < 5; i++) expect((await post("203.0.113.53", "https://github.com/acme/after-brief")).status).toBe(503);
    expect((await post("203.0.113.53")).status).toBe(429);
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
