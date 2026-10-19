/** exp_hero_headline: the home page h1. Pure: shared by the server flag lookup, the headline component and its tests. */
import { EXPERIMENTS, fallbackServed, isVariant, type Served } from "./experiments";

export const HERO_HEADLINE_CONTROL = "Paste your repo. Get your whole launch.";
/** Placeholder wording, pending owner approval: replace this string and nothing else. */
export const HERO_HEADLINE_TEST = "Paste a GitHub link. Get your launch posts written for you.";

/** The h1 waits on this lookup, so past this it's aborted and the page shows control rather than hold the headline back. */
export const HERO_FLAG_TIMEOUT_MS = 500;
/** Past this after it's first styled, a headline that still hasn't streamed in shows control (CSS only, so a stalled render can't leave it blank). */
export const HERO_FAILSAFE_MS = 700;

export const heroHeadline = (served: Served | null | undefined): string => (served?.variant === "test" ? HERO_HEADLINE_TEST : HERO_HEADLINE_CONTROL);
/** The other arm's headline, whose box every arm reserves, so both are the same height and nothing moves. */
export const otherHeroHeadline = (text: string): string => (text === HERO_HEADLINE_TEST ? HERO_HEADLINE_CONTROL : HERO_HEADLINE_TEST);

/** The first sentence and the rest, which the h1 highlights. A headline with no sentence break isn't highlighted. */
export function splitHeadline(text: string): [lead: string, rest: string] {
  const match = /^(.+?[.!?])\s+(\S.*)$/.exec(text);
  return match ? [match[1], match[2]] : [text, ""];
}

interface FlagsResponse {
  flags?: Record<string, { enabled?: boolean; variant?: string | null } | undefined>;
  errorsWhileComputingFlags?: boolean;
  quotaLimited?: string[];
}

/**
 * exp_hero_headline for one page view: a single POST to PostHog's /flags for a fresh id, aborted at `timeoutMs`
 * (no retries, and nothing left running once it returns). null when the flag doesn't exist or is switched off
 * (PostHog leaves it out): the experiment isn't running, so control is shown and nothing is recorded. Otherwise
 * the variant, or control as a fallback when the lookup times out, fails, or gives this id no variant.
 */
export async function lookupHeroHeadline({
  host,
  token,
  distinctId,
  fetch: fetchImpl = fetch,
  timeoutMs = HERO_FLAG_TIMEOUT_MS,
  onError,
}: {
  host: string;
  token: string;
  distinctId: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  onError?: (error: unknown) => void;
}): Promise<Served | null> {
  const key = EXPERIMENTS.heroHeadline;
  let body: FlagsResponse;
  try {
    const res = await fetchImpl(`${host}/flags/?v=2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, distinct_id: distinctId, flag_keys_to_evaluate: [key], geoip_disable: true }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`PostHog /flags answered ${res.status}`);
    body = (await res.json()) as FlagsResponse;
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return fallbackServed("timeout");
    onError?.(error);
    return fallbackServed("error");
  }
  const flag = body.flags?.[key];
  if (!flag) return body.errorsWhileComputingFlags || body.quotaLimited?.includes("feature_flags") ? fallbackServed("error") : null;
  if (!flag.enabled) return fallbackServed("unassigned");
  return isVariant(key, flag.variant) ? { variant: flag.variant } : fallbackServed("unassigned");
}
