import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { PostHog } from "posthog-node";
import type { Attribution } from "./attribution";
import { deployEnv } from "./deploy-env";
import { env } from "./env";
import { isAnalyticsId, type ExperimentKey, type Variant } from "./experiments";
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
  /** The promotion code on the session (LAUNCH14, or one a Ship Loop buyer typed); `amount` is then the discounted price. */
  promo_code?: string;
  /** "unavailable" when the promo arm asked for LAUNCH14 but Stripe wouldn't take it. */
  promo?: "applied" | "unavailable";
}

type FeatureProperties = Partial<Record<`$feature/${ExperimentKey}`, Variant>>;

/** Kit purchases also carry the kit's first-touch utm_* and referring_domain. */
export interface ServerEvents {
  checkout_started: CheckoutProperties & FeatureProperties & Attribution;
  checkout_completed: CheckoutProperties & FeatureProperties & Attribution & { stripeSessionId: string };
  /** A paid Checkout we couldn't record ("record", Stripe will retry) or whose kit generation crashed ("fulfil"). */
  checkout_fulfilment_failed: { plan: ProductId; kitId?: string; stripeSessionId: string; stripeEventId: string; stage: "record" | "fulfil"; errorName: string; mock: boolean };
}

let client: PostHog | null = null;
function posthog(): PostHog | null {
  if (!env.posthogKey) return null;
  // Serverless: send each event straight away rather than batching.
  client ??= new PostHog(env.posthogKey, { host: posthogHost(), flushAt: 1, flushInterval: 0 });
  return client;
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

/** Never throws: analytics must not break checkout. No-op without NEXT_PUBLIC_POSTHOG_KEY. Adds `product_type` from `plan`. */
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
      properties: { ...params.properties, product_type: productType(params.properties.plan), env: deployEnv(), $process_person_profile: false },
    });
  } catch (error) {
    captureException(error, { stage: "analytics.capture", event });
  }
}
