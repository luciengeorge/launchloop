import type { FallbackReason } from "./experiments";

/**
 * Kill switch for the kit paywall's early unlock CTA (a button under the paywall heading, and a sticky bar below lg).
 * A PostHog boolean flag run at 100%, not an experiment: no exposure event, and no `$feature/` property on events.
 * Off, or not evaluated in time, the paywall is exactly what it was before the early CTA.
 */
export const PAYWALL_EARLY_CTA_FLAG = "exp_paywall_early_cta";

/** Past this, the paywall renders without the early CTA rather than hold the kit page for a slow flags request. */
export const PAYWALL_EARLY_CTA_TIMEOUT_MS = 800;

/**
 * Marks the server-rendered element around an unlock button and its errors (the early CTA, the panel's column), with
 * the early CTA on: the sticky bar stays out of the way while one is in view.
 */
export const UNLOCK_ZONE_ATTRIBUTE = "data-unlock-zone";

/** What the paywall rendered. `fallback`: PostHog didn't answer, so it's off without having been switched off. */
export interface PaywallEarlyCta {
  enabled: boolean;
  fallback?: Extract<FallbackReason, "error" | "timeout">;
}

/** On for a boolean flag that's on, or "test" if it's ever set up as a multivariate flag. Everything else is off. */
export const isEarlyCtaOn = (value: unknown): boolean => value === true || value === "test";

const TIMED_OUT = Symbol("timed out");

/**
 * The kill switch from a flag evaluation that may fail. `undefined` is posthog-node's answer for a failed or timed-out
 * request (and for a flag that doesn't exist), so it's a fallback; `false` is a flag that's switched off. Never throws.
 */
export async function resolveEarlyCta(
  evaluate: () => Promise<unknown>,
  { timeoutMs = PAYWALL_EARLY_CTA_TIMEOUT_MS, onError }: { timeoutMs?: number; onError?: (error: unknown) => void } = {},
): Promise<PaywallEarlyCta> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
  });
  try {
    const value = await Promise.race([evaluate(), timeout]);
    if (value === TIMED_OUT) return { enabled: false, fallback: "timeout" };
    if (value === undefined) return { enabled: false, fallback: "error" };
    return { enabled: isEarlyCtaOn(value) };
  } catch (error) {
    onError?.(error);
    return { enabled: false, fallback: "error" };
  } finally {
    clearTimeout(timer);
  }
}
