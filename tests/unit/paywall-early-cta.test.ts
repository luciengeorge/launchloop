import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  posthog: true,
  getFeatureFlag: vi.fn<(key: string, distinctId: string, options: unknown) => Promise<unknown>>(async () => true),
  captureExceptionThrottled: vi.fn(),
}));

vi.mock("@/lib/analytics-server", () => ({ posthog: () => (m.posthog ? { getFeatureFlag: m.getFeatureFlag } : null) }));
vi.mock("@/lib/observability", () => ({ captureExceptionThrottled: m.captureExceptionThrottled }));

const { PAYWALL_EARLY_CTA_FLAG, PAYWALL_EARLY_CTA_TIMEOUT_MS, resolveEarlyCta } = await import("@/lib/paywall-cta");
const { resolvePaywallEarlyCta } = await import("@/lib/paywall-cta-server");

beforeEach(() => {
  m.posthog = true;
  m.getFeatureFlag.mockResolvedValue(true);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("exp_paywall_early_cta kill switch", () => {
  it("is on only when the flag is on: a boolean flag at true, or a 'test' variant", async () => {
    for (const value of [true, "test"]) expect(await resolveEarlyCta(async () => value)).toEqual({ enabled: true });
  });

  it("is off, as a decision (no fallback), when the flag answers off or anything else", async () => {
    for (const value of [false, "control", "treatment", null, "", 1]) expect(await resolveEarlyCta(async () => value)).toEqual({ enabled: false });
  });

  it("falls back to off when PostHog doesn't answer: posthog-node's undefined, or a throw (reported)", async () => {
    expect(await resolveEarlyCta(async () => undefined)).toEqual({ enabled: false, fallback: "error" });
    const onError = vi.fn();
    const boom = new Error("flags down");
    expect(
      await resolveEarlyCta(
        async () => {
          throw boom;
        },
        { onError },
      ),
    ).toEqual({ enabled: false, fallback: "error" });
    expect(onError).toHaveBeenCalledWith(boom);
  });

  it("falls back to off at the timeout rather than hold the kit page, even if the flag would be on", async () => {
    vi.useFakeTimers();
    const late = resolveEarlyCta(() => new Promise((resolve) => setTimeout(() => resolve(true), PAYWALL_EARLY_CTA_TIMEOUT_MS + 500)));
    await vi.advanceTimersByTimeAsync(PAYWALL_EARLY_CTA_TIMEOUT_MS);
    expect(await late).toEqual({ enabled: false, fallback: "timeout" });
    expect(PAYWALL_EARLY_CTA_TIMEOUT_MS).toBeLessThanOrEqual(1000);
  });

  it("is read for the kit (kit:<id>), with no exposure event and no GeoIP", async () => {
    expect(await resolvePaywallEarlyCta("kit_abc123")).toEqual({ enabled: true });
    expect(m.getFeatureFlag).toHaveBeenCalledWith(PAYWALL_EARLY_CTA_FLAG, "kit:kit_abc123", { sendFeatureFlagEvents: false, disableGeoip: true });
    expect(PAYWALL_EARLY_CTA_FLAG).toBe("exp_paywall_early_cta");
  });

  it("is off without a PostHog key (local dev), without asking or calling it a fallback", async () => {
    m.posthog = false;
    expect(await resolvePaywallEarlyCta("kit_abc123")).toEqual({ enabled: false });
    expect(m.getFeatureFlag).not.toHaveBeenCalled();
  });

  it("reports a throwing flags call (throttled) and serves the paywall without the early CTA", async () => {
    m.getFeatureFlag.mockRejectedValue(new Error("socket hang up"));
    expect(await resolvePaywallEarlyCta("kit_abc123")).toEqual({ enabled: false, fallback: "error" });
    expect(m.captureExceptionThrottled).toHaveBeenCalledWith("flags.paywall_early_cta", expect.any(Error), { stage: "flags.paywall_early_cta" });
  });
});
