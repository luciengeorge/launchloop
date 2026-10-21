import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ lookup: vi.fn(), captureExceptionThrottled: vi.fn() }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/env", () => ({ env: { posthogKey: "phc_test" } }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: m.captureExceptionThrottled }));
vi.mock("@/lib/hero-headline", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/hero-headline")>()), lookupHeroHeadline: m.lookup }));

const { HERO_FLAG_TIMEOUT_CAP_MS, heroFlagTimeoutMs, heroHeadlineAssignment } = await import("@/lib/hero-headline-server");

beforeEach(() => {
  m.lookup.mockResolvedValue({ variant: "control" });
});

describe("heroFlagTimeoutMs", () => {
  it("is 500 ms by default, or for an override that isn't a positive number", () => {
    for (const value of [undefined, "", "abc", "0"]) {
      if (value === undefined) vi.stubEnv("HERO_FLAG_TIMEOUT_MS", undefined);
      else vi.stubEnv("HERO_FLAG_TIMEOUT_MS", value);
      expect(heroFlagTimeoutMs(), `HERO_FLAG_TIMEOUT_MS=${value}`).toBe(500);
    }
  });

  it("takes an override up to 2.5 s, and caps anything longer at 2.5 s", () => {
    expect(HERO_FLAG_TIMEOUT_CAP_MS).toBe(2500);
    for (const [value, expected] of [
      ["300", 300],
      ["2500", 2500],
      ["2501", 2500],
      ["60000", 2500],
      ["Infinity", 2500],
    ] as const) {
      vi.stubEnv("HERO_FLAG_TIMEOUT_MS", value);
      expect(heroFlagTimeoutMs(), `HERO_FLAG_TIMEOUT_MS=${value}`).toBe(expected);
    }
  });

  it("is what the per-view lookup gets", async () => {
    vi.stubEnv("HERO_FLAG_TIMEOUT_MS", "30000");
    await heroHeadlineAssignment();
    expect(m.lookup).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 2500, distinctId: expect.stringMatching(/^hero:[\da-f-]{36}$/) }));
  });
});

describe("heroHeadlineAssignment", () => {
  it("reports a failed lookup through the throttled Sentry capture, under one key", async () => {
    await heroHeadlineAssignment();
    const { onError } = m.lookup.mock.calls[0][0] as { onError: (error: unknown) => void };
    const error = new Error("PostHog /flags answered 503");
    onError(error);
    expect(m.captureExceptionThrottled).toHaveBeenCalledWith("flags.hero_headline", error, { stage: "flags.hero_headline" });
  });
});
