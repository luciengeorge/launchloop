/** PostHog multivariate flags (50/50), each with the variants in VARIANTS. Pure: shared by browser and server. */
export const EXPERIMENTS = {
  launchPromo: "exp_launch14_promo",
  shipLoopUpsell: "exp_shiploop_success_upsell",
  heroSampleCta: "exp_hero_sample_cta",
} as const;

export type ExperimentKey = (typeof EXPERIMENTS)[keyof typeof EXPERIMENTS];

/** Each flag's variant keys as set up in PostHog. Anything else PostHog returns is treated as unassigned. */
export const VARIANTS = {
  exp_launch14_promo: ["control", "treatment"],
  exp_shiploop_success_upsell: ["control", "treatment"],
  exp_hero_sample_cta: ["control", "test"],
} as const satisfies Record<ExperimentKey, readonly ["control", ...string[]]>;

export type VariantOf<K extends ExperimentKey> = (typeof VARIANTS)[K][number];
export type Variant = VariantOf<ExperimentKey>;
/** The variant each experiment showed on the page that made the request. */
export type Experiments = Partial<Record<ExperimentKey, Variant>>;

export const isVariantOf = <K extends ExperimentKey>(key: K, value: unknown): value is VariantOf<K> =>
  (VARIANTS[key] as readonly unknown[]).includes(value);

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
export interface Served<V extends Variant = Variant> {
  variant: V;
  fallback?: FallbackReason;
}

export const fallbackServed = (reason: FallbackReason): Served<"control"> => ({ variant: "control", fallback: reason });

/**
 * The id the kit paywall's experiments are bucketed on. PostHog hashes the flag on this rather
 * than the page's anonymous id (new on every load), so a kit shows the same price on every reload
 * and device, with nothing stored in the browser.
 */
export const kitBucketingId = (kitId: string) => `kit:${kitId}`;

const isExperimentKey = (key: string): key is ExperimentKey => Object.hasOwn(VARIANTS, key);

/** Keeps only known experiments with one of their variants; anything else in a request body is dropped. */
export function parseExperiments(value: unknown): Experiments {
  if (!value || typeof value !== "object") return {};
  const out: Experiments = {};
  for (const [key, variant] of Object.entries(value)) {
    if (isExperimentKey(key) && isVariantOf(key, variant)) out[key] = variant;
  }
  return out;
}

/** Known experiment keys from a request body (an array) or Stripe metadata (a comma-separated string). */
export function parseFallbacks(value: unknown): ExperimentKey[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(items.filter((k): k is ExperimentKey => typeof k === "string" && isExperimentKey(k)))];
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
 * with it, so flag variants and funnel events stay on one id without cookies or storage.
 */
export const ANALYTICS_ID_PARAM = "aid";

const ANALYTICS_ID_RE = /^[\w$:.-]{1,200}$/;
export const isAnalyticsId = (v: unknown): v is string => typeof v === "string" && ANALYTICS_ID_RE.test(v);

/** Appends `aid` to a same-site path when there's a valid id to carry. */
export function withAnalyticsId(path: string, id: unknown): string {
  if (!isAnalyticsId(id)) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${ANALYTICS_ID_PARAM}=${encodeURIComponent(id)}`;
}
