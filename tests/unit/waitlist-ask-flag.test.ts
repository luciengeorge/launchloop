import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  posthog: true,
  getFeatureFlag: vi.fn<(key: string, distinctId: string, options: unknown) => Promise<unknown>>(async () => true),
  captureExceptionThrottled: vi.fn(),
}));

vi.mock("@/lib/analytics-server", () => ({ posthog: () => (m.posthog ? { getFeatureFlag: m.getFeatureFlag } : null) }));
vi.mock("@/lib/observability", () => ({ captureExceptionThrottled: m.captureExceptionThrottled }));

const { KILL_SWITCH_TIMEOUT_MS } = await import("@/lib/kill-switch");
const { PAYWALL_EARLY_CTA_TIMEOUT_MS } = await import("@/lib/paywall-cta");
const { SHIPLOOP_WAITLIST_ASK_FLAG } = await import("@/lib/waitlist");
const { resolveShipLoopWaitlistAsk } = await import("@/lib/waitlist-ask-server");

const KIT_ID = "kit_0123456789abcdef";

beforeEach(() => {
  m.posthog = true;
  m.getFeatureFlag.mockResolvedValue(true);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("shiploop_waitlist_ask kill switch", () => {
  it("flag true: the ask shows; read on kit:<id>, with no exposure event and no GeoIP", async () => {
    expect(await resolveShipLoopWaitlistAsk(KIT_ID)).toBe(true);
    expect(SHIPLOOP_WAITLIST_ASK_FLAG).toBe("shiploop_waitlist_ask");
    expect(m.getFeatureFlag).toHaveBeenCalledWith("shiploop_waitlist_ask", `kit:${KIT_ID}`, { sendFeatureFlagEvents: false, disableGeoip: true });
    // The old experiment is never read.
    expect(m.getFeatureFlag).not.toHaveBeenCalledWith("exp_shiploop_success_upsell", expect.anything(), expect.anything());
  });

  it("flag false (switched off): hidden", async () => {
    m.getFeatureFlag.mockResolvedValue(false);
    expect(await resolveShipLoopWaitlistAsk(KIT_ID)).toBe(false);
  });

  it("only a boolean true counts: a variant, a string or a number is off", async () => {
    for (const value of ["test", "treatment", "true", 1, null]) {
      m.getFeatureFlag.mockResolvedValue(value);
      expect(await resolveShipLoopWaitlistAsk(KIT_ID), String(value)).toBe(false);
    }
  });

  it("flag error or missing (posthog-node's undefined): fails closed, hidden", async () => {
    m.getFeatureFlag.mockResolvedValue(undefined);
    expect(await resolveShipLoopWaitlistAsk(KIT_ID)).toBe(false);
  });

  it("a throwing flags call: hidden, and reported (throttled)", async () => {
    m.getFeatureFlag.mockRejectedValue(new Error("socket hang up"));
    expect(await resolveShipLoopWaitlistAsk(KIT_ID)).toBe(false);
    expect(m.captureExceptionThrottled).toHaveBeenCalledWith("flags.shiploop_waitlist_ask", expect.any(Error), { stage: "flags.shiploop_waitlist_ask" });
  });

  it("no answer in time: hidden at the kill switch timeout, the paywall's own 800ms, even if the flag would be on", async () => {
    expect(PAYWALL_EARLY_CTA_TIMEOUT_MS).toBe(KILL_SWITCH_TIMEOUT_MS);
    expect(KILL_SWITCH_TIMEOUT_MS).toBe(800);
    vi.useFakeTimers();
    m.getFeatureFlag.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), KILL_SWITCH_TIMEOUT_MS + 500)));
    const shown = resolveShipLoopWaitlistAsk(KIT_ID);
    await vi.advanceTimersByTimeAsync(KILL_SWITCH_TIMEOUT_MS);
    expect(await shown).toBe(false);
  });

  it("no PostHog key (local dev): hidden, without asking", async () => {
    m.posthog = false;
    expect(await resolveShipLoopWaitlistAsk(KIT_ID)).toBe(false);
    expect(m.getFeatureFlag).not.toHaveBeenCalled();
  });
});
