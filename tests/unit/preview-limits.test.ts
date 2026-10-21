import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));

/** Fresh copies of the modules that read the limits at load, under the given PREVIEW_RATE_LIMIT_* env. */
async function load(perHour: string | undefined, perDay: string | undefined) {
  vi.stubEnv("PREVIEW_RATE_LIMIT_PER_HOUR", perHour);
  vi.stubEnv("PREVIEW_RATE_LIMIT_PER_DAY", perDay);
  vi.resetModules();
  const rateLimit = await import("@/lib/rate-limit");
  const errors = await import("@/lib/errors");
  const site = await import("@/lib/site");
  return { ...rateLimit, ...errors, ...site };
}

const REPO = "https://github.com/acme/app";
const request = (ip: string) => new Request("http://localhost/api/kits", { method: "POST", headers: { "x-forwarded-for": ip } });
const freeAnswer = (faq: readonly { q: string; a: string }[]) => faq.find((item) => item.q === "What's free?")!.a;

beforeEach(() => {
  kv.store = new MemoryStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("free preview limits: the limiter and the copy read the same numbers", () => {
  it("with no override: 10 an hour and 40 a day, and the copy is unchanged", async () => {
    const m = await load(undefined, undefined);
    expect(m.PREVIEW_LIMITS_RESOLVED).toEqual({ perHour: 10, perDay: 40 });
    expect(m.resolvedPreviewLimits()).toEqual({ perHour: 10, perDay: 40 });
    expect(m.PREVIEW_ALLOWANCE).toBe("You can run 10 an hour and 40 a day.");
    expect(m.KIT_ERRORS.rate_limited.fix).toBe("You can run 10 an hour and 40 a day. Try again later, or unlock the full kit for an app you've already previewed.");
    expect(m.rateLimitedBody(1380)).toMatchObject({
      fix: "You can run 10 an hour and 40 a day. Try again in 23 min, or unlock the full kit for an app you've already previewed.",
      limits: { perHour: 10, perDay: 40 },
    });
    expect(freeAnswer(m.FAQ)).toContain("up to 10 an hour and 40 a day.");
  });

  it("PREVIEW_RATE_LIMIT_PER_HOUR=3 and _PER_DAY=7: the limiter enforces 3 and 7, and every message says 3 and 7", async () => {
    const m = await load("3", "7");
    expect(m.PREVIEW_LIMITS_RESOLVED).toEqual({ perHour: 3, perDay: 7 });
    expect(m.resolvedPreviewLimits()).toEqual({ perHour: 3, perDay: 7 });
    expect(m.PREVIEW_ALLOWANCE).toBe("You can run 3 an hour and 7 a day.");
    expect(m.KIT_ERRORS.rate_limited.fix).toContain("You can run 3 an hour and 7 a day.");
    expect(m.rateLimitedBody(60).fix).toContain("You can run 3 an hour and 7 a day.");
    expect(freeAnswer(m.FAQ)).toContain("up to 3 an hour and 7 a day.");

    // Three in the first hour of a UTC day, then the 4th is refused with the same numbers in the copy.
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-20T00:05:00Z") });
    const ip = "203.0.113.30";
    for (let i = 0; i < 3; i++) expect((await m.freePreviewGate(request(ip), REPO)).refused).toBeNull();
    const hourly = (await m.freePreviewGate(request(ip), REPO)).refused!;
    expect(hourly.status).toBe(429);
    const hourlyBody = await hourly.json();
    expect(hourlyBody.limits).toEqual({ perHour: 3, perDay: 7 });
    expect(hourlyBody.fix).toMatch(/^You can run 3 an hour and 7 a day\. Try again in 55 min,/);

    // 3 more the next hour and 1 the hour after reach 7 for the day; the 8th is refused by the daily window.
    vi.setSystemTime(new Date("2026-10-20T01:05:00Z"));
    for (let i = 0; i < 3; i++) expect((await m.freePreviewGate(request(ip), REPO)).refused).toBeNull();
    vi.setSystemTime(new Date("2026-10-20T02:05:00Z"));
    expect((await m.freePreviewGate(request(ip), REPO)).refused).toBeNull();
    const daily = (await m.freePreviewGate(request(ip), REPO)).refused!;
    expect(daily.status).toBe(429);
    const dailyBody = await daily.json();
    expect(dailyBody.retryAfterSeconds).toBe(22 * 60 * 60 - 5 * 60);
    expect(dailyBody.fix).toMatch(/^You can run 3 an hour and 7 a day\. Try again in 22 hours,/);
  });

  it.each([
    ["not numbers", "lots", "many"],
    ["zero", "0", "0"],
    ["negative", "-3", "-7"],
    ["fractions", "2.5", "7.5"],
    ["blank", " ", ""],
    ["Infinity", "Infinity", "Infinity"],
  ])("an invalid override (%s) falls back to the defaults instead of switching the limit off", async (_, perHour, perDay) => {
    const m = await load(perHour, perDay);
    expect(m.PREVIEW_LIMITS_RESOLVED).toEqual({ perHour: 10, perDay: 40 });
    expect(m.PREVIEW_ALLOWANCE).toBe("You can run 10 an hour and 40 a day.");
    expect(m.rateLimitedBody(60).limits).toEqual({ perHour: 10, perDay: 40 });

    const ip = "203.0.113.31";
    for (let i = 0; i < 10; i++) expect((await m.freePreviewGate(request(ip), REPO)).refused).toBeNull();
    const refused = (await m.freePreviewGate(request(ip), REPO)).refused!;
    expect(refused.status).toBe(429);
    expect((await refused.json()).fix).toMatch(/^You can run 10 an hour and 40 a day\./);
  });

  it("one valid and one invalid override: the valid one applies, the other keeps its default", async () => {
    const m = await load("3", "lots");
    expect(m.PREVIEW_LIMITS_RESOLVED).toEqual({ perHour: 3, perDay: 40 });
    expect(m.PREVIEW_ALLOWANCE).toBe("You can run 3 an hour and 40 a day.");
  });
});
