/** Pure: shared by the server flag lookup, the marketing price component and its tests. */

/** Past this, marketing pages show the plain price rather than wait on a slow flags request. */
export const LAUNCH_PROMO_TIMEOUT_MS = 1500;

/** LAUNCH14 ends here (22 Oct 2026, 22:00 Paris), whatever exp_launch14_promo says. */
export const LAUNCH_PROMO_ENDS_AT = Date.parse("2026-10-22T20:00:00Z");

/** False from LAUNCH_PROMO_ENDS_AT on. Checked before any flag read, so none happens after the end. */
export const isBeforePromoEnd = (now: number) => now < LAUNCH_PROMO_ENDS_AT;

/**
 * Whether exp_launch14_promo is on, from a flag evaluation that may fail. Only "treatment" turns it on:
 * control, a disabled flag, no PostHog key, an error or a timeout all mean the plain £19.
 */
export async function resolveLaunchPromo(evaluate: () => Promise<unknown>, options: FlagOptions = {}): Promise<boolean> {
  return (await evaluateFlag(evaluate, options)) === "treatment";
}

type FlagOptions = { timeoutMs?: number; onError?: (error: unknown) => void };

/** A server-side flag value for a marketing page: undefined after an error (reported to `onError`) or `timeoutMs`. */
export async function evaluateFlag(evaluate: () => Promise<unknown>, { timeoutMs = LAUNCH_PROMO_TIMEOUT_MS, onError }: FlagOptions = {}): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });
  try {
    return await Promise.race([evaluate(), timeout]);
  } catch (error) {
    onError?.(error);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
