"use client";

import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { trackExposure } from "./analytics";
import type { ExperimentKey, Variant } from "./experiments";

/** Past this, show control rather than hold the paywall price for a slow or blocked flags request. */
const FLAGS_TIMEOUT_MS = 1500;

/**
 * The variant to show, or undefined until it's known (render a neutral placeholder).
 * Settles once per mount so the page never flips. Reading the flag sends PostHog's
 * $feature_flag_called exposure; a timeout or a flags error falls back to control
 * without one, so those visitors stay out of the experiment.
 */
export function useExperiment(key: ExperimentKey): Variant | undefined {
  const [variant, setVariant] = useState<Variant>();
  useEffect(() => {
    let settled = false;
    const settle = (v: Variant) => {
      if (settled) return;
      settled = true;
      setVariant(v);
    };
    // Without NEXT_PUBLIC_POSTHOG_KEY there are no flags: everyone is control.
    const timer = setTimeout(() => settle("control"), posthog.__loaded ? FLAGS_TIMEOUT_MS : 0);
    const off = posthog.__loaded
      ? posthog.onFeatureFlags((_flags, _variants, context) => {
          if (context?.errorsLoading) settle("control");
          else if (!settled) settle(posthog.getFeatureFlag(key) === "treatment" ? "treatment" : "control");
        })
      : undefined;
    return () => {
      clearTimeout(timer);
      off?.();
    };
  }, [key]);
  return variant;
}

/**
 * Like useExperiment, for a variant the server assigned on a fixed id (see kitVariant), so it
 * doesn't change with this page's anonymous id. Undefined until the server's answer streams in.
 * Records the $feature_flag_called exposure once per view; no assignment shows control without one.
 */
export function useAssignedExperiment(key: ExperimentKey, assigned: Promise<Variant | undefined>): Variant | undefined {
  const [variant, setVariant] = useState<Variant>();
  const settled = useRef(false);
  useEffect(() => {
    let live = true;
    const settle = (v: Variant | undefined) => {
      if (!live || settled.current) return;
      settled.current = true;
      setVariant(v ?? "control");
      if (v) trackExposure(key, v);
    };
    assigned.then(settle, () => settle(undefined));
    return () => {
      live = false;
    };
  }, [key, assigned]);
  return variant;
}
