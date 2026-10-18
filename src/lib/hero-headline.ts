/** exp_hero_headline: the home page h1. Pure: shared by the server flag lookup, the headline component and its tests. */
import { EXPERIMENTS, fallbackServed, isVariant, type Served } from "./experiments";

export const HERO_HEADLINE_CONTROL = "Paste your repo. Get your whole launch.";
/** Placeholder wording, pending owner approval: replace this string and nothing else. */
export const HERO_HEADLINE_TEST = "Paste a GitHub link. Get your launch posts written for you.";

/** The h1 waits on this lookup, so past this it shows control rather than hold the headline (and LCP) back. */
export const HERO_FLAG_TIMEOUT_MS = 500;

export const heroHeadline = (served: Served | null | undefined): string => (served?.variant === "test" ? HERO_HEADLINE_TEST : HERO_HEADLINE_CONTROL);

/** The first sentence and the rest, which the h1 highlights. A headline with no sentence break isn't highlighted. */
export function splitHeadline(text: string): [lead: string, rest: string] {
  const match = /^(.+?[.!?])\s+(\S.*)$/.exec(text);
  return match ? [match[1], match[2]] : [text, ""];
}

/**
 * exp_hero_headline for one page view, from PostHog's flags for a fresh id. null when the flag doesn't exist or is
 * switched off (PostHog leaves it out): the experiment isn't running, so control is shown and nothing is recorded.
 * posthog-node answers a failed request the same way. Otherwise the variant, or control as a fallback when the
 * lookup is slow or throws, or the flag doesn't give this id a variant.
 */
export async function resolveHeroHeadline(
  evaluate: () => Promise<Record<string, unknown>>,
  { timeoutMs = HERO_FLAG_TIMEOUT_MS, onError }: { timeoutMs?: number; onError?: (error: unknown) => void } = {},
): Promise<Served | null> {
  const key = EXPERIMENTS.heroHeadline;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  try {
    const flags = await Promise.race([evaluate(), timeout]);
    if (flags === "timeout") return fallbackServed("timeout");
    if (!(key in flags)) return null;
    const value = flags[key];
    return isVariant(key, value) ? { variant: value } : fallbackServed("unassigned");
  } catch (error) {
    onError?.(error);
    return fallbackServed("error");
  } finally {
    clearTimeout(timer);
  }
}
