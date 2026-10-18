"use client";

import { useEffect, useRef, useState } from "react";
import { analyticsEnabled, loadAnalytics, trackServed } from "./analytics";
import { fallbackServed, type ExperimentKey, type Served } from "./experiments";

/** Past this, show control rather than hold the page for a slow or blocked flags request. */
const FLAGS_TIMEOUT_MS = 1500;

/** Settles once per mount, so the page never flips, and records what it served (see trackServed). */
function useServed(key: ExperimentKey, start: (settle: (served: Served) => void) => () => void): Served | undefined {
  const [served, setServed] = useState<Served>();
  const settled = useRef(false);
  useEffect(() => {
    let live = true;
    const stop = start((s) => {
      if (!live || settled.current) return;
      settled.current = true;
      setServed(s);
      trackServed(key, s);
    });
    return () => {
      live = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `start` is recreated every render; the experiment is identified by `key`
  }, [key]);
  return served;
}

/**
 * The variant to show, evaluated by posthog-js on this page's id, or undefined until it's known
 * (render a neutral placeholder). A timeout, a flags error or a flag that's off serves control as
 * a fallback. Without NEXT_PUBLIC_POSTHOG_KEY there are no flags and nothing is recorded.
 */
export function useExperiment(key: ExperimentKey): Served | undefined {
  return useServed(key, (settle) => {
    if (!analyticsEnabled) {
      settle(fallbackServed("unassigned"));
      return () => {};
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let off: (() => void) | undefined;
    // The SDK may still be loading; the flags request starts when it initialises, so time it from there.
    void loadAnalytics().then((posthog) => {
      if (stopped) return;
      if (!posthog) return settle(fallbackServed("error"));
      timer = setTimeout(() => settle(fallbackServed("timeout")), FLAGS_TIMEOUT_MS);
      off = posthog.onFeatureFlags((_flags, _variants, context) => {
        if (context?.errorsLoading) return settle(fallbackServed("error"));
        // send_event: false, so the only exposure is trackServed's, with the variant actually shown.
        const value = posthog.getFeatureFlag(key, { send_event: false });
        settle(value === "control" || value === "treatment" ? { variant: value } : fallbackServed("unassigned"));
      });
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      off?.();
    };
  });
}

/**
 * Like useExperiment, for an assignment the server made on a fixed id (see resolveKitPromo), so it
 * doesn't change with this page's anonymous id. Undefined until the server's answer streams in.
 */
export function useAssignedExperiment(key: ExperimentKey, assigned: Promise<Served>): Served | undefined {
  return useServed(key, (settle) => {
    assigned.then(settle, () => settle(fallbackServed("error")));
    return () => {};
  });
}
