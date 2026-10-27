import type { FallbackReason } from "./experiments";

/** Past this, a kill switch PostHog hasn't answered is off, rather than hold the page for a slow flags request. */
export const KILL_SWITCH_TIMEOUT_MS = 800;

/** A kill switch as the page rendered it. `fallback`: PostHog didn't answer, so it's off without having been switched off. */
export interface KillSwitch {
  enabled: boolean;
  fallback?: Extract<FallbackReason, "error" | "timeout">;
}

const TIMED_OUT = Symbol("timed out");

/**
 * A PostHog kill switch (a boolean flag run at 100%) from a flag evaluation that may fail. It fails closed: `undefined`
 * is posthog-node's answer for a failed or timed-out request and for a flag that doesn't exist, so it's off as a
 * fallback, and so are a throw and the timeout; `false` is a flag that's switched off. `isOn` decides what counts as on
 * (default: exactly `true`). Never throws.
 */
export async function resolveKillSwitch(
  evaluate: () => Promise<unknown>,
  { isOn = (value) => value === true, timeoutMs = KILL_SWITCH_TIMEOUT_MS, onError }: { isOn?: (value: unknown) => boolean; timeoutMs?: number; onError?: (error: unknown) => void } = {},
): Promise<KillSwitch> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
  });
  try {
    const value = await Promise.race([evaluate(), timeout]);
    if (value === TIMED_OUT) return { enabled: false, fallback: "timeout" };
    if (value === undefined) return { enabled: false, fallback: "error" };
    return { enabled: isOn(value) };
  } catch (error) {
    onError?.(error);
    return { enabled: false, fallback: "error" };
  } finally {
    clearTimeout(timer);
  }
}
