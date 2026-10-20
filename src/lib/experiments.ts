/** PostHog multivariate flags (50/50, variants "control" and "treatment"). Pure: shared by browser and server. */
export const EXPERIMENTS = {
  launchPromo: "exp_launch14_promo",
  shipLoopUpsell: "exp_shiploop_success_upsell",
} as const;

export type ExperimentKey = (typeof EXPERIMENTS)[keyof typeof EXPERIMENTS];
export type Variant = "control" | "treatment";
/** The variant each experiment showed on the page that made the request. */
export type Experiments = Partial<Record<ExperimentKey, Variant>>;

/**
 * Why a page served control without a PostHog assignment: flags didn't arrive in time, the flags
 * request failed, or the flag is off (or not a variant) for this id.
 */
export type FallbackReason = "timeout" | "error" | "unassigned";

/**
 * What a page served for one experiment. A fallback is always control and is kept out of the
 * experiment: it gets a flag_fallback event instead of a $feature_flag_called exposure, so slow or
 * blocked flag loads can't pile un-bucketed visitors into the control arm.
 */
export interface Served {
  variant: Variant;
  fallback?: FallbackReason;
}

export const fallbackServed = (reason: FallbackReason): Served => ({ variant: "control", fallback: reason });

/**
 * The id the kit paywall's experiments are bucketed on. PostHog hashes the flag on this rather
 * than the visitor's anonymous id (new in every tab), so a kit shows the same price in every tab
 * and on every device, with nothing stored in the browser for it.
 */
export const kitBucketingId = (kitId: string) => `kit:${kitId}`;

const KEYS = new Set<string>(Object.values(EXPERIMENTS));

/** Keeps only known experiments with a known variant; anything else in a request body is dropped. */
export function parseExperiments(value: unknown): Experiments {
  if (!value || typeof value !== "object") return {};
  const out: Experiments = {};
  for (const [key, variant] of Object.entries(value)) {
    if (KEYS.has(key) && (variant === "control" || variant === "treatment")) out[key as ExperimentKey] = variant;
  }
  return out;
}

/** Known experiment keys from a request body (an array) or Stripe metadata (a comma-separated string). */
export function parseFallbacks(value: unknown): ExperimentKey[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(items.filter((k): k is ExperimentKey => typeof k === "string" && KEYS.has(k)))];
}

/**
 * The served variants as event properties: `$feature/<key>` (the shape PostHog breaks experiments
 * down by) for assignments, `fallback/<key>` for control served as a fallback, which stays out of
 * the experiment's numbers.
 */
export type FeatureProperties = Partial<Record<`$feature/${ExperimentKey}` | `fallback/${ExperimentKey}`, Variant>>;
export function featureProperties(experiments: Experiments, fallbacks: ExperimentKey[] = []): FeatureProperties {
  return Object.fromEntries(Object.entries(experiments).map(([key, variant]) => [fallbacks.includes(key as ExperimentKey) ? `fallback/${key}` : `$feature/${key}`, variant]));
}

/**
 * Query param that carries the page's anonymous PostHog id across a full page load we
 * control (magic link, Stripe Checkout and its return). The next page bootstraps PostHog
 * with it, so flag variants and funnel events stay on one id without cookies, even in a
 * new tab, where the tab's own copy of the id (see pageAnalyticsId) isn't there.
 */
export const ANALYTICS_ID_PARAM = "aid";

const ANALYTICS_ID_RE = /^[\w$:.-]{1,200}$/;
export const isAnalyticsId = (v: unknown): v is string => typeof v === "string" && ANALYTICS_ID_RE.test(v);

/** Appends `aid` to a same-site path when there's a valid id to carry. */
export function withAnalyticsId(path: string, id: unknown): string {
  if (!isAnalyticsId(id)) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${ANALYTICS_ID_PARAM}=${encodeURIComponent(id)}`;
}
