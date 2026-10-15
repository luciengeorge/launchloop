/** PostHog multivariate flags (50/50, variants "control" and "treatment"). Pure: shared by browser and server. */
export const EXPERIMENTS = {
  launchPromo: "exp_launch14_promo",
  shipLoopUpsell: "exp_shiploop_success_upsell",
} as const;

export type ExperimentKey = (typeof EXPERIMENTS)[keyof typeof EXPERIMENTS];
export type Variant = "control" | "treatment";
/** The variant each experiment showed on the page that made the request. */
export type Experiments = Partial<Record<ExperimentKey, Variant>>;

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

/** `$feature/<key>` properties, the shape PostHog uses to break events down by flag variant. */
export function featureProperties(experiments: Experiments): Partial<Record<`$feature/${ExperimentKey}`, Variant>> {
  return Object.fromEntries(Object.entries(experiments).map(([key, variant]) => [`$feature/${key}`, variant]));
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
