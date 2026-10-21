import { EXPERIMENTS, isVariant, type ExperimentKey, type FallbackReason, type Served } from "./experiments";

/**
 * What a server-rendered experiment showed, written on the element that shows it, so analytics can read it from the
 * HTML before React hydrates that element (and before its effect calls rememberServed). An element for an experiment
 * that isn't running carries the key alone. A Suspense fallback that's still waiting for it carries
 * `data-experiment-pending`.
 */
export function servedMarker(key: ExperimentKey, served: Served | null) {
  return {
    "data-experiment": key,
    ...(served ? { "data-variant": served.variant } : {}),
    ...(served?.fallback ? { "data-fallback": served.fallback } : {}),
  };
}

const FALLBACKS: readonly FallbackReason[] = ["timeout", "error", "unassigned", "interacted"];
const isExperimentKey = (value: unknown): value is ExperimentKey => (Object.values(EXPERIMENTS) as unknown[]).includes(value);

/** The page's marker for `key`: what it showed, null if it isn't running, undefined if nothing is marked yet. */
export function readServedMarker(key: ExperimentKey, root: ParentNode | undefined = globalThis.document): Served | null | undefined {
  const marked = typeof root?.querySelectorAll === "function" ? [...root.querySelectorAll(`[data-experiment="${key}"]`)].at(-1) : undefined;
  if (!marked) return undefined;
  const variant = marked.getAttribute("data-variant");
  if (!isVariant(key, variant)) return null;
  const fallback = marked.getAttribute("data-fallback");
  return FALLBACKS.includes(fallback as FallbackReason) ? { variant, fallback: fallback as FallbackReason } : { variant };
}

/** Experiments a Suspense fallback on the page is still waiting for. */
export function pendingMarkers(root: ParentNode | undefined = globalThis.document): ExperimentKey[] {
  if (typeof root?.querySelectorAll !== "function") return [];
  return [...root.querySelectorAll("[data-experiment-pending]")].map((el) => el.getAttribute("data-experiment-pending")).filter(isExperimentKey);
}
