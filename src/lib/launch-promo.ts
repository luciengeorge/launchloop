/** Pure: shared by the server flag lookup, the marketing price component and its tests. */

/** Past this, marketing pages show the plain price rather than wait on a slow flags request. */
export const LAUNCH_PROMO_TIMEOUT_MS = 1500;

/**
 * Whether exp_launch14_promo is on, from a flag evaluation that may fail. Only "treatment" turns it on:
 * control, a disabled flag, no PostHog key, an error or a timeout all mean the plain £19.
 */
export async function resolveLaunchPromo(
  evaluate: () => Promise<unknown>,
  { timeoutMs = LAUNCH_PROMO_TIMEOUT_MS, onError }: { timeoutMs?: number; onError?: (error: unknown) => void } = {},
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  try {
    return (await Promise.race([evaluate(), timeout])) === "treatment";
  } catch (error) {
    onError?.(error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
