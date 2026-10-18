import posthog, { type CaptureResult } from "posthog-js";
import { type Attribution, readLandingAttribution } from "./attribution";
import { ANALYTICS_ID_PARAM, EXPERIMENTS, isAnalyticsId, type ExperimentKey, type FallbackReason, type Served, type Variant } from "./experiments";
import type { NewsletterPlacement, WelcomeOutcome } from "./newsletter";
import { POSTHOG_PROXY_PATH, posthogUiHost } from "./posthog-config";
import { scrubProperties } from "./scrub-url";
import type { StartPlan } from "./start-intent";

export type PreviewSource = "github" | "site" | "sample";

/** Browser events. Checkout events are captured server-side (see analytics-server.ts) so they carry the Stripe price. */
export interface ClientEvents {
  preview_started: { source: PreviewSource; plan: StartPlan; isLoggedIn: boolean };
  preview_completed: { kitId: string; source: PreviewSource; plan: StartPlan; isLoggedIn: boolean; durationMs: number };
  preview_failed: {
    code: string;
    source: PreviewSource;
    plan: StartPlan;
    isLoggedIn: boolean;
    durationMs: number;
    phase?: "request" | "stream";
    errorName?: string;
    errorMessage?: string;
    online?: boolean;
    visibility?: DocumentVisibilityState;
    /** The server had accepted the preview, so the form sent the visitor to /kit/[id] instead of showing an error. */
    recovered?: boolean;
  };
  newsletter_subscribed: { placement: NewsletterPlacement; welcome: WelcomeOutcome };
  /** Control served without a PostHog assignment (see Served). Not an exposure, so it stays out of the experiment. */
  flag_fallback: { flag: ExperimentKey; variant: Variant; reason: FallbackReason; fallback: true };
}

/** Landing with ?qa=1 tags every event on this page load as QA traffic. */
const QA_PARAM = "qa";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

let landing: Attribution | undefined;
let landed = false;

/**
 * Reads the landing URL's UTMs and the referrer's domain once per page load and keeps them in memory (no cookies or
 * storage). In-app navigations keep them; the preview request sends them so the kit remembers where the buyer came from.
 */
export function rememberFirstTouch() {
  if (landed) return;
  landed = true;
  landing = readLandingAttribution(window.location, document.referrer);
}

export const firstTouch = (): Attribution | undefined => landing;

/**
 * Cookieless: identity lives in page memory only, so nothing is written to cookies or
 * storage and no consent banner is needed. The trade-off is a new anonymous id per full
 * page load. Where we cause the reload (magic link, Stripe Checkout and back) the previous
 * page's id rides along as `?aid=` and is reused here, so flag variants don't re-roll
 * mid-purchase. A manual reload or a new visit still gets a fresh id.
 */
export function initAnalytics() {
  if (!key || posthog.__loaded) return;
  const params = new URLSearchParams(window.location.search);
  const handoff = params.get(ANALYTICS_ID_PARAM);
  posthog.init(key, {
    ...(isAnalyticsId(handoff) ? { bootstrap: { distinctID: handoff } } : {}),
    api_host: POSTHOG_PROXY_PATH,
    ui_host: posthogUiHost(),
    defaults: "2026-08-30",
    persistence: "memory",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: false,
    autocapture: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    disable_session_recording: true,
    disable_surveys: true,
    before_send: scrubEvent,
  });
  posthog.register({
    env: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // posthog-js already drops events when this is true unless its bot filter is turned off.
    is_webdriver: navigator.webdriver === true,
    ...(params.get(QA_PARAM) === "1" ? { qa: true } : {}),
  });
}

/**
 * posthog-js tags every event with `$feature/<key>` from its own flag evaluation for this page's id,
 * which needn't be what the page served (the promo is bucketed on the kit; a timeout serves control).
 * Experiment variants travel only on exposures and the server's checkout events, which set them explicitly.
 */
function withoutAutoExperimentProperties(event: CaptureResult): CaptureResult["properties"] {
  if (event.event === "$feature_flag_called") return event.properties;
  const properties = { ...event.properties };
  for (const key of Object.values(EXPERIMENTS)) delete properties[`$feature/${key}`];
  return properties;
}

function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: scrubProperties(withoutAutoExperimentProperties(event)),
    ...(event.$set ? { $set: scrubProperties(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: scrubProperties(event.$set_once) } : {}),
  };
}

export function track<E extends keyof ClientEvents>(event: E, properties: ClientEvents[E]) {
  if (posthog.__loaded) posthog.capture(event, properties);
}

/**
 * Records what an experiment served on this page, once per view, always with the variant shown:
 * PostHog's $feature_flag_called exposure for an assignment, or flag_fallback for control served
 * without one, which keeps the view out of the experiment.
 */
export function trackServed(key: ExperimentKey, served: Served) {
  if (!posthog.__loaded) return;
  if (served.fallback) track("flag_fallback", { flag: key, variant: served.variant, reason: served.fallback, fallback: true });
  else posthog.capture("$feature_flag_called", { $feature_flag: key, $feature_flag_response: served.variant, [`$feature/${key}`]: served.variant });
}

/** This page's anonymous PostHog id, sent with checkout so server events join the same funnel. */
export function analyticsId(): string | undefined {
  return posthog.__loaded ? posthog.get_distinct_id() : undefined;
}