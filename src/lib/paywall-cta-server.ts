import "server-only";
import { posthog } from "./analytics-server";
import { kitBucketingId } from "./experiments";
import { captureExceptionThrottled } from "./observability";
import { PAYWALL_EARLY_CTA_FLAG, resolveEarlyCta, type PaywallEarlyCta } from "./paywall-cta";

/**
 * exp_paywall_early_cta for a kit's paywall, read on `kit:<kitId>` like the paywall's other flags, so a kit looks the
 * same on every reload. Without a PostHog key (local dev) it's off. Sends no exposure. Never throws.
 */
export async function resolvePaywallEarlyCta(kitId: string): Promise<PaywallEarlyCta> {
  const ph = posthog();
  if (!ph) return { enabled: false };
  return resolveEarlyCta(() => ph.getFeatureFlag(PAYWALL_EARLY_CTA_FLAG, kitBucketingId(kitId), { sendFeatureFlagEvents: false, disableGeoip: true }), {
    // A PostHog outage fails every paywall view, so one report a minute per instance.
    onError: (error) => captureExceptionThrottled("flags.paywall_early_cta", error, { stage: "flags.paywall_early_cta" }),
  });
}
