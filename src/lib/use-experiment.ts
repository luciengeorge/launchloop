"use client";

import posthog from "posthog-js";
import { useEffect, useState } from "react";
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
