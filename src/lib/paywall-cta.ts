import { KILL_SWITCH_TIMEOUT_MS, resolveKillSwitch, type KillSwitch } from "./kill-switch";

/**
 * Kill switch for the kit paywall's early unlock CTA (a button under the paywall heading, and a sticky bar below lg).
 * A PostHog boolean flag run at 100%, not an experiment: no exposure event, and no `$feature/` property on events.
 * Off, or not evaluated in time, the paywall is exactly what it was before the early CTA.
 */
export const PAYWALL_EARLY_CTA_FLAG = "exp_paywall_early_cta";

/** Past this, the paywall renders without the early CTA rather than hold the kit page for a slow flags request. */
export const PAYWALL_EARLY_CTA_TIMEOUT_MS = KILL_SWITCH_TIMEOUT_MS;

/** The sticky site header covers the top 3.5rem: an unlock button under it isn't in view. */
export const SITE_HEADER_PX = 56;

/**
 * Marks the server-rendered element around an unlock button and its errors (the early CTA, the panel's column), with
 * the early CTA on: the sticky bar stays out of the way while one is in view.
 */
export const UNLOCK_ZONE_ATTRIBUTE = "data-unlock-zone";

/** What the paywall rendered. `fallback`: PostHog didn't answer, so it's off without having been switched off. */
export type PaywallEarlyCta = KillSwitch;

/** On for a boolean flag that's on, or "test" if it's ever set up as a multivariate flag. Everything else is off. */
export const isEarlyCtaOn = (value: unknown): boolean => value === true || value === "test";

/** The early CTA's kill switch from a flag evaluation that may fail (see resolveKillSwitch). Never throws. */
export const resolveEarlyCta = (evaluate: () => Promise<unknown>, options: { timeoutMs?: number; onError?: (error: unknown) => void } = {}): Promise<PaywallEarlyCta> =>
  resolveKillSwitch(evaluate, { isOn: isEarlyCtaOn, timeoutMs: PAYWALL_EARLY_CTA_TIMEOUT_MS, ...options });
