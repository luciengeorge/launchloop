import "server-only";
import { cacheLife } from "next/cache";
import { posthog } from "./analytics-server";
import { deployEnv } from "./deploy-env";
import { MARKETING_DISTINCT_ID } from "./launch-promo-server";
import { evaluateFlag } from "./launch-promo";
import { resolveCalendarFlag, resolveInlineFlag } from "./newsletter";
import { captureException } from "./observability";

/** Kill switch for the inline signups (blog_inline, home_inline) and the footer link that replaces the footer form next to them. */
export const NEWSLETTER_INLINE_FLAG = "newsletter-inline-signup";

/**
 * Swaps the signup reward to the 7-day launch calendar (form copy, success links, welcome email) and makes the calendar
 * and the /newsletter archive indexable. Separate from the inline flag so either can be turned off on its own.
 */
export const NEWSLETTER_CALENDAR_FLAG = "newsletter-calendar-reward";

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

/** Whether newsletter-calendar-reward is on, cached like isNewsletterInlineOn(). See resolveCalendarFlag for what counts as on. */
export async function isNewsletterCalendarOn(): Promise<boolean> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
  const env = deployEnv();
  return resolveCalendarFlag({
    override: process.env.NEWSLETTER_CALENDAR,
    env,
    flag: async () => {
      const ph = posthog();
      if (!ph) return undefined;
      return evaluateFlag(
        () => ph.getFeatureFlag(NEWSLETTER_CALENDAR_FLAG, MARKETING_DISTINCT_ID, { sendFeatureFlagEvents: false, personProperties: { deploy_env: env } }),
        { onError: (error) => captureException(error, { stage: "flags.newsletter_calendar" }) },
      );
    },
  });
}
