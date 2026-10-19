"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
 * For an assignment the server made on a fixed id and already rendered into the page (see resolveKitPromo):
 * returns it as is, so the server HTML and the first client render show it, and records it once per mount
 * like useExperiment. Nothing about what's shown waits on the browser.
 */
export function useServerAssignment(key: ExperimentKey, served: Served): Served {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackServed(key, served);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount, with what the first render showed
  }, [key]);
  return served;
}

/**
 * What this page load has shown for a server-rendered experiment (see useRenderedExperiment); null when it wasn't
 * running. Page memory only, like the analytics id, and only written in the browser.
 */
const shownThisPage = new Map<ExperimentKey, Served | null>();

const noSubscription = () => () => {};

/** What this page load already showed for `key`, or undefined (always, during server rendering and hydration). */
export function useShownExperiment(key: ExperimentKey): Served | null | undefined {
  return useSyncExternalStore(
    noSubscription,
    () => shownThisPage.get(key),
    () => undefined,
  );
}

/**
 * For a variant the server rendered into the HTML, so the first paint is already final. Returns the server's
 * assignment, or what this page load showed before (a client-side return to the page re-renders on the server,
 * with a fresh assignment), and records it once per mount like useExperiment. The record waits for the SDK's
 * deferred load rather than pulling it in during hydration. `served` null: the experiment isn't running, so
 * nothing is recorded.
 */
export function useRenderedExperiment(key: ExperimentKey, served: Served | null): Served | null {
  const [shown] = useState(() => (shownThisPage.has(key) ? shownThisPage.get(key)! : served));
  const recorded = useRef(false);
  useEffect(() => {
    if (!shownThisPage.has(key)) shownThisPage.set(key, shown);
    if (!shown || recorded.current) return;
    recorded.current = true;
    trackServed(key, shown, { whenLoaded: true });
  }, [key, shown]);
  return shown;
}
