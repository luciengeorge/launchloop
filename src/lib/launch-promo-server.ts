import "server-only";
import { cacheLife } from "next/cache";
import { posthog } from "./analytics-server";
import { EXPERIMENTS } from "./experiments";
import { isBeforePromoEnd, resolveLaunchPromo } from "./launch-promo";
import { captureException } from "./observability";

/**
 * Marketing pages are shared and cached, so there's no visitor id to bucket. They read flags for one
 * fixed id: right at a 0% or 100% rollout, which is how exp_launch14_promo and newsletter-inline-signup are run. No exposure event.
 */
export const MARKETING_DISTINCT_ID = "launchloop-marketing-pages";

/**
 * exp_launch14_promo for public marketing pages and checkouts that arrive without a variant.
 * Cached for a minute, so a flag flip shows up without a redeploy; any failure is the plain £19.
 * Off from LAUNCH_PROMO_ENDS_AT without asking PostHog. The clock is read inside the cache, so an
 * entry cached just before the end can still say on until it revalidates.
 */
export async function isLaunchPromoOn(): Promise<boolean> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
  if (!isBeforePromoEnd(Date.now())) return false;
  const ph = posthog();
  if (!ph) return false;
  return resolveLaunchPromo(() => ph.getFeatureFlag(EXPERIMENTS.launchPromo, MARKETING_DISTINCT_ID, { sendFeatureFlagEvents: false }), {
    onError: (error) => captureException(error, { stage: "flags.launch_promo" }),
  });
}
