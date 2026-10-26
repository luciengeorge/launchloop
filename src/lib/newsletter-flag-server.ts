import "server-only";
import { cacheLife } from "next/cache";
import { posthog } from "./analytics-server";
import { deployEnv } from "./deploy-env";
import { MARKETING_DISTINCT_ID } from "./launch-promo-server";
import { evaluateFlag } from "./launch-promo";
import { resolveInlineFlag } from "./newsletter";
import { captureException } from "./observability";

/** Kill switch for the inline signups (blog_inline, home_inline) and the footer link that replaces the footer form next to them. */
export const NEWSLETTER_INLINE_FLAG = "newsletter-inline-signup";

/**
 * Whether the inline signups render. Cached like isLaunchPromoOn(), so pages stay prerendered with the right blocks in
 * their HTML (nothing flashes or shifts) and a flip shows up when the cache revalidates, within a few minutes and with
 * no deploy. A missing flag, a variant string, an error, a timeout or no PostHog key are all off.
 */
export async function isNewsletterInlineOn(): Promise<boolean> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
  const env = deployEnv();
  return resolveInlineFlag({
    override: process.env.NEWSLETTER_INLINE,
    env,
    flag: async () => {
      const ph = posthog();
      if (!ph) return undefined;
      return evaluateFlag(
        () => ph.getFeatureFlag(NEWSLETTER_INLINE_FLAG, MARKETING_DISTINCT_ID, { sendFeatureFlagEvents: false, personProperties: { deploy_env: env } }),
        { onError: (error) => captureException(error, { stage: "flags.newsletter_inline" }) },
      );
    },
  });
}
