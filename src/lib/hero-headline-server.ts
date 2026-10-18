import "server-only";
import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { posthog } from "./analytics-server";
import { EXPERIMENTS, type Served } from "./experiments";
import { resolveHeroHeadline } from "./hero-headline";
import { captureException } from "./observability";

/**
 * exp_hero_headline for this page view. The page is cached and the browser keeps no id across page loads, so
 * each view is bucketed on a fresh id, the same unit as the browser's anonymous id. Sends nothing itself: the
 * page records the exposure on its own id, the one its preview and checkout events use (as with kit:<id>).
 */
export async function heroHeadlineAssignment(): Promise<Served | null> {
  await connection();
  const ph = posthog();
  if (!ph) return null;
  return resolveHeroHeadline(() => ph.getAllFlags(`hero:${randomUUID()}`, { flagKeys: [EXPERIMENTS.heroHeadline], disableGeoip: true }), {
    onError: (error) => captureException(error, { stage: "flags.hero_headline" }),
  });
}
