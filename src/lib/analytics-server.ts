import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { PostHog } from "posthog-node";
import { deployEnv } from "./deploy-env";
import { env } from "./env";
import { fallbackServed, isAnalyticsId, kitBucketingId, type ExperimentKey, type FallbackReason, type FeatureProperties, type Served, type Variant } from "./experiments";
import { LAUNCH_PROMO_TIMEOUT_MS } from "./launch-promo";
import { captureException } from "./observability";
import { posthogHost } from "./posthog-config";
import { productType, type ProductId } from "./products";

interface CheckoutProperties {
  plan: ProductId;
  kitId?: string;
  /** Stripe Price id, or "inline" when Checkout uses inline price data (no STRIPE_PRICE_* set). */
  price_id: string;
  amount: number;
  currency: string;
  isLoggedIn: boolean;
  mock: boolean;
  /** The promotion code on the session (LAUNCH14 on the kit); `amount` is then the discounted price. */
  promo_code?: string;
  /** "unavailable" when the promo arm asked for LAUNCH14 but Stripe wouldn't take it. */
  promo?: "applied" | "unavailable";
}

export interface ServerEvents {
  checkout_started: CheckoutProperties & FeatureProperties;
  checkout_completed: CheckoutProperties & FeatureProperties & { stripeSessionId: string };
  /** The server couldn't get an assignment where it needed one (see resolveKitPromo). `remembered`: it used the kit's last assignment. */
  flag_fallback: { flag: ExperimentKey; variant: Variant; reason: FallbackReason; fallback: true; source: "checkout"; remembered: boolean; kitId: string };
}

let client: PostHog | null = null;
/** Shared by event capture and server-side flag reads. Null without NEXT_PUBLIC_POSTHOG_KEY. */
export function posthog(): PostHog | null {
  if (!env.posthogKey) return null;
  // Serverless: send each event straight away rather than batching. Flags get the same 1.5s budget as the browser.
  client ??= new PostHog(env.posthogKey, { host: posthogHost(), flushAt: 1, flushInterval: 0, featureFlagsRequestTimeoutMs: LAUNCH_PROMO_TIMEOUT_MS });
  return client;
}

/**
 * The variant PostHog assigns a kit (bucketed on `kit:<kitId>`). When PostHog doesn't answer
 * (error or the 1.5s timeout) or the flag is off, it's control as a fallback (see Served).
 * Sends nothing itself; the page records the exposure or fallback on the visitor's id, the id its
 * checkout events use. Never throws.
 */
export async function kitAssignment(key: ExperimentKey, kitId: string): Promise<Served> {
  try {
    const ph = posthog();
    if (!ph) return fallbackServed("unassigned");
    const value = await ph.getFeatureFlag(key, kitBucketingId(kitId), { sendFeatureFlagEvents: false, disableGeoip: true });
    if (value === "control" || value === "treatment") return { variant: value };
    // posthog-node answers undefined when the flags request fails or times out, false when the flag is off.
    return fallbackServed(value === undefined ? "error" : "unassigned");
  } catch (error) {
    captureException(error, { stage: "analytics.flag", key });
    return fallbackServed("error");
  }
}

/** The browser's anonymous id when it sent a sane one, else a fresh server id so the event still counts. */
export function resolveDistinctId(value: unknown): string {
  return isAnalyticsId(value) ? value : `server_${randomUUID()}`;
}

/** Same uuid for the same logical event, so PostHog drops duplicates from Stripe webhook retries. */
export function eventUuid(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Never throws: analytics must not break checkout. No-op without NEXT_PUBLIC_POSTHOG_KEY. Adds `product_type` from `plan` when there is one. */
export async function captureServerEvent<E extends keyof ServerEvents>(
  event: E,
  params: { distinctId: string; properties: ServerEvents[E]; uuid?: string },
): Promise<void> {
  try {
    const ph = posthog();
    if (!ph) return;
    await ph.captureImmediate({
      distinctId: params.distinctId,
      event,
      uuid: params.uuid,
      // Anonymous funnel events: don't create person profiles server-side either.
      properties: {
        ...params.properties,
        ...("plan" in params.properties ? { product_type: productType(params.properties.plan) } : {}),
        env: deployEnv(),
        $process_person_profile: false,
      },
    });
  } catch (error) {
    captureException(error, { stage: "analytics.capture", event });
  }
}
