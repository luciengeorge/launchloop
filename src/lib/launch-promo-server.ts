import "server-only";
import { cacheLife } from "next/cache";
import { posthog } from "./analytics-server";
import { EXPERIMENTS } from "./experiments";
import { resolveLaunchPromo } from "./launch-promo";
import { captureException } from "./observability";

/**
 * Marketing pages are shared and cached, so there's no visitor id to bucket. They read the flag for one
 * fixed id: right at a 0% or 100% rollout, which is how exp_launch14_promo is run now. No exposure event.
 */
const MARKETING_DISTINCT_ID = "launchloop-marketing-pages";

/**
 * exp_launch14_promo for public marketing pages and checkouts that arrive without a variant.
 * Cached for a minute, so a flag flip shows up without a redeploy; any failure is the plain £19.
 */
export async function isLaunchPromoOn(): Promise<boolean> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
  const ph = posthog();
  if (!ph) return false;
  return resolveLaunchPromo(() => ph.getFeatureFlag(EXPERIMENTS.launchPromo, MARKETING_DISTINCT_ID, { sendFeatureFlagEvents: false }), {
    onError: (error) => captureException(error, { stage: "flags.launch_promo" }),
  });
}
