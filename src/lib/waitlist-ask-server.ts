import "server-only";
import { posthog } from "./analytics-server";
import { kitBucketingId } from "./experiments";
import { resolveKillSwitch } from "./kill-switch";
import { captureExceptionThrottled } from "./observability";
import { SHIPLOOP_WAITLIST_ASK_FLAG } from "./waitlist";

/**
 * shiploop_waitlist_ask for a kit's success page, read on `kit:<kitId>` like the kit page's other flags. Fails closed:
 * the ask shows only when the flag answers `true` in time. Without a PostHog key (local dev) it's hidden. Sends no
 * exposure. Never throws.
 */
export async function resolveShipLoopWaitlistAsk(kitId: string): Promise<boolean> {
  const ph = posthog();
  if (!ph) return false;
  const ask = await resolveKillSwitch(() => ph.getFeatureFlag(SHIPLOOP_WAITLIST_ASK_FLAG, kitBucketingId(kitId), { sendFeatureFlagEvents: false, disableGeoip: true }), {
    // A PostHog outage fails every success page, so one report a minute per instance.
    onError: (error) => captureExceptionThrottled("flags.shiploop_waitlist_ask", error, { stage: "flags.shiploop_waitlist_ask" }),
  });
  return ask.enabled;
}
