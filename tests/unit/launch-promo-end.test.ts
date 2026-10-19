import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  kv: new Map<string, unknown>(),
  getFeatureFlag: vi.fn<(key: string, distinctId: string, options: unknown) => Promise<unknown>>(async () => "treatment"),
  kitAssignment: vi.fn<(flag: string, kitId: string) => Promise<{ variant: "control" | "treatment"; fallback?: "timeout" | "error" | "unassigned" }>>(async () => ({ variant: "treatment" })),
}));

vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
vi.mock("@/lib/analytics-server", () => ({ posthog: () => ({ getFeatureFlag: m.getFeatureFlag }), kitAssignment: m.kitAssignment }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/store", () => ({
  store: () => ({
    get: async (key: string) => m.kv.get(key) ?? null,
    set: async (key: string, value: unknown) => void m.kv.set(key, value),
  }),
}));

const { LAUNCH_PROMO_ENDS_AT, isBeforePromoEnd } = await import("@/lib/launch-promo");
const { isLaunchPromoOn } = await import("@/lib/launch-promo-server");
const { resolveKitPromo } = await import("@/lib/kit-promo");

const KIT_ID = "kitPromoEnd000001";
const at = (time: number) => vi.setSystemTime(time);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  m.kv.clear();
  m.getFeatureFlag.mockResolvedValue("treatment");
  m.kitAssignment.mockResolvedValue({ variant: "treatment" });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("LAUNCH_PROMO_ENDS_AT", () => {
  it("is 22 Oct 2026, 22:00 Paris (20:00 UTC), and the promo is over from that instant", () => {
    expect(new Date(LAUNCH_PROMO_ENDS_AT).toISOString()).toBe("2026-10-22T20:00:00.000Z");
    expect(isBeforePromoEnd(LAUNCH_PROMO_ENDS_AT - 1)).toBe(true);
    expect(isBeforePromoEnd(LAUNCH_PROMO_ENDS_AT)).toBe(false);
    expect(isBeforePromoEnd(LAUNCH_PROMO_ENDS_AT + 1)).toBe(false);
  });
});

describe("isLaunchPromoOn (marketing pages)", () => {
  it("before the end, flag on: on", async () => {
    at(LAUNCH_PROMO_ENDS_AT - 1);
    expect(await isLaunchPromoOn()).toBe(true);
    expect(m.getFeatureFlag).toHaveBeenCalledWith("exp_launch14_promo", expect.any(String), expect.anything());
  });

  it("at or after the end, flag on: off, without reading the flag", async () => {
    for (const time of [LAUNCH_PROMO_ENDS_AT, LAUNCH_PROMO_ENDS_AT + 60 * 60 * 1000]) {
      at(time);
      expect(await isLaunchPromoOn()).toBe(false);
    }
    expect(m.getFeatureFlag).not.toHaveBeenCalled();
  });

  it("flag off: off, before and after the end", async () => {
    m.getFeatureFlag.mockResolvedValue(false);
    for (const time of [LAUNCH_PROMO_ENDS_AT - 1, LAUNCH_PROMO_ENDS_AT]) {
      at(time);
      expect(await isLaunchPromoOn()).toBe(false);
    }
  });
});

describe("resolveKitPromo (paywall and /api/checkout)", () => {
  it("before the end, flag on for the kit: treatment", async () => {
    at(LAUNCH_PROMO_ENDS_AT - 1);
    expect(await resolveKitPromo(KIT_ID)).toEqual({ variant: "treatment", source: "posthog" });
  });

  it("at or after the end, flag on: control, without reading the flag or the remembered variant", async () => {
    m.kv.set(`kitpromo:${KIT_ID}`, "treatment");
    for (const time of [LAUNCH_PROMO_ENDS_AT, LAUNCH_PROMO_ENDS_AT + 60 * 60 * 1000]) {
      at(time);
      expect(await resolveKitPromo(KIT_ID)).toEqual({ variant: "control", fallback: "unassigned", source: "fallback" });
    }
    expect(m.kitAssignment).not.toHaveBeenCalled();
  });

  it("flag off: control, before and after the end", async () => {
    m.kitAssignment.mockResolvedValue({ variant: "control", fallback: "unassigned" });
    for (const time of [LAUNCH_PROMO_ENDS_AT - 1, LAUNCH_PROMO_ENDS_AT]) {
      at(time);
      expect(await resolveKitPromo(KIT_ID)).toMatchObject({ variant: "control" });
    }
  });
});
