import "server-only";
import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { env } from "./env";
import type { Served } from "./experiments";
import { HERO_FLAG_TIMEOUT_MS, lookupHeroHeadline } from "./hero-headline";
import { captureExceptionThrottled } from "./observability";
import { posthogHost } from "./posthog-config";

/**
 * HERO_EXPERIMENT=1 turns on exp_hero_headline's per-view path. Read while the page is prerendered, so it takes a
 * deploy to change; unset, the home page is fully static with the original h1 and never asks PostHog.
 */
export const heroExperimentEnabled = () => process.env.HERO_EXPERIMENT?.trim() === "1";

/**
 * exp_hero_headline for this page view. The page is cached and the browser keeps no id across page loads, so
 * each view is bucketed on a fresh id, the same unit as the browser's anonymous id. Sends nothing itself: the
 * page records the exposure on its own id, the one its preview and checkout events use (as with kit:<id>).
 */
export async function heroHeadlineAssignment(): Promise<Served | null> {
  await connection();
  if (!env.posthogKey) return null;
  return lookupHeroHeadline({
    host: posthogHost(),
    token: env.posthogKey,
    distinctId: `hero:${randomUUID()}`,
    timeoutMs: heroFlagTimeoutMs(),
    // A PostHog outage fails every view, so one report a minute per instance, not one per page view.
    onError: (error) => captureExceptionThrottled("flags.hero_headline", error, { stage: "flags.hero_headline" }),
  });
}

/** The h1 waits on the lookup, so an override (the e2e build's slow fake PostHog) can't hold it back more than this. */
export const HERO_FLAG_TIMEOUT_CAP_MS = 2500;

export const heroFlagTimeoutMs = () => Math.min(Number(process.env.HERO_FLAG_TIMEOUT_MS) || HERO_FLAG_TIMEOUT_MS, HERO_FLAG_TIMEOUT_CAP_MS);
