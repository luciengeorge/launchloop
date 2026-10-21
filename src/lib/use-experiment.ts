"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { afterPageLoad, analyticsEnabled, loadAnalytics, rememberServed, servedEarlier, trackServed } from "./analytics";
import { fallbackServed, isVariant, type ExperimentKey, type Served, type Variant } from "./experiments";

/** Past this, show control rather than hold the page for a slow or blocked flags request. */
const FLAGS_TIMEOUT_MS = 1500;

/** Settles once per mount, so the page never flips, and records what it served (see trackServed and rememberServed). */
function useServed<S extends Served>(key: ExperimentKey, start: (settle: (served: S) => void) => () => void): S | undefined {
  const [served, setServed] = useState<S>();
  const settled = useRef(false);
  useEffect(() => {
    let live = true;
    const stop = start((s) => {
      if (!live || settled.current) return;
      settled.current = true;
      setServed(s);
      rememberServed(key, s);
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

interface ExperimentOptions {
  /**
   * Don't load the PostHog SDK early for this: wait until it loads after the window load event (instrumentation-client),
   * or sooner if something else needs it. For above-the-fold experiments, where loading it early would slow the page.
   */
  afterPageLoad?: boolean;
  /**
   * A press or key inside this element before the flag resolves serves control for the rest of the page load
   * (flag_fallback, reason "interacted"), so a visitor already using what control shows never sees it change,
   * and their clicks and preview aren't counted for a variant they didn't see.
   */
  freezeOnInteraction?: RefObject<HTMLElement | null>;
}

/**
 * The variant to show, evaluated by posthog-js on this page's id, or undefined until it's known
 * (render control or a neutral placeholder). A timeout, a flags error or a flag that's off serves control as
 * a fallback. Without NEXT_PUBLIC_POSTHOG_KEY there are no flags and nothing is recorded.
 * What this page load served first is served again on a later mount (a client-side return to the page), and every
 * event the page sends afterwards carries it (see rememberServed).
 */
export function useExperiment<K extends ExperimentKey>(key: K, options: ExperimentOptions = {}): Served<Variant<K>> | undefined {
  return useServed<Served<Variant<K>>>(key, (settle) => {
    const earlier = servedEarlier(key) as Served<Variant<K>> | undefined;
    if (earlier) {
      settle(earlier);
      return () => {};
    }
    if (!analyticsEnabled) {
      settle(fallbackServed("unassigned"));
      return () => {};
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let off: (() => void) | undefined;
    const area = options.freezeOnInteraction?.current;
    const interacted = () => settle(fallbackServed("interacted"));
    area?.addEventListener("pointerdown", interacted, { capture: true });
    area?.addEventListener("keydown", interacted, { capture: true });
    // The SDK may still be loading; the flags request starts when it initialises, so time it from there.
    void (options.afterPageLoad ? afterPageLoad().then(loadAnalytics) : loadAnalytics()).then((posthog) => {
      if (stopped) return;
      if (!posthog) return settle(fallbackServed("error"));
      timer = setTimeout(() => settle(fallbackServed("timeout")), FLAGS_TIMEOUT_MS);
      off = posthog.onFeatureFlags((_flags, _variants, context) => {
        if (context?.errorsLoading) return settle(fallbackServed("error"));
        // send_event: false, so the only exposure is trackServed's, with the variant actually shown.
        const value = posthog.getFeatureFlag(key, { send_event: false });
        settle(isVariant(key, value) ? { variant: value } : fallbackServed("unassigned"));
      });
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      off?.();
      area?.removeEventListener("pointerdown", interacted, { capture: true });
      area?.removeEventListener("keydown", interacted, { capture: true });
    };
  });
}

/**
 * For an assignment the server made on a fixed id and already rendered into the page (see resolveKitPromo):
 * returns it as is, so the server HTML and the first client render show it, and records it once per mount
 * like useExperiment. Nothing about what's shown waits on the browser.
 */
export function useServerAssignment<S extends Served>(key: ExperimentKey, served: S): S {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackServed(key, served);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount, with what the first render showed
  }, [key]);
  return served;
}
