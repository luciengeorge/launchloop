"use client";

import { type RefObject, useEffect } from "react";
import { afterPageLoad, firstTouch, track, type ClientEvents } from "./analytics";
import type { NewsletterPlacement } from "./newsletter";
import { scrubPath } from "./scrub-url";

type ViewedEvent = ClientEvents["newsletter_form_viewed"];
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

/** Placement and path pairs already reported on this page load. The footer outlives client navigations, hence the path. */
const sent = new Set<string>();

/**
 * Sends newsletter_form_viewed the first time the form is at least half on screen, once per placement per page. The
 * event waits for the page load like the SDK does, so a form near the fold doesn't pull posthog-js into the critical path.
 */
export function useFormViewed(ref: RefObject<HTMLElement | null>, placement: NewsletterPlacement) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return;
        // Explicitly scrubbed: before_send only scrubs keys ending in url, referrer or pathname, and /kit/<id> is private.
        const path = scrubPath(window.location.pathname);
        const key = `${placement} ${path}`;
        if (sent.has(key)) return;
        sent.add(key);
        const landing = firstTouch();
        const utm: Pick<ViewedEvent, (typeof UTM_KEYS)[number]> = {};
        for (const k of UTM_KEYS) if (landing?.[k]) utm[k] = landing[k];
        void afterPageLoad().then(() => track("newsletter_form_viewed", { placement, path, ...utm }));
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    // Observing again makes the observer report the current state, for a form that stays on screen across a client navigation.
    const navigation = (window as { navigation?: EventTarget }).navigation;
    const rearm = () => {
      observer.unobserve(el);
      observer.observe(el);
    };
    navigation?.addEventListener("currententrychange", rearm);
    return () => {
      observer.disconnect();
      navigation?.removeEventListener("currententrychange", rearm);
    };
  }, [ref, placement]);
}
