import type { CaptureResult, PostHog, PostHogInterface } from "posthog-js";
import { type Attribution, QA_PARAM, readLandingAttribution } from "./attribution";
import { ANALYTICS_ID_PARAM, EXPERIMENTS, featureProperties, isAnalyticsId, type ExperimentKey, type FallbackReason, type Served, type Variant } from "./experiments";
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
  /**
   * A click on a link, a button or the URL field in the home hero (HeroClicks). `label` is the visible text, or the
   * field's label: never what was typed. `link_url` is scrubbed like every URL.
   */
  hero_clicked: { element: "a" | "button" | "input"; label: string; link_url?: string };
  /** Control served without a PostHog assignment (see Served). Not an exposure, so it stays out of the experiment. */
  flag_fallback: { flag: ExperimentKey; variant: Variant; reason: FallbackReason; fallback: true };
}

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export const analyticsEnabled = Boolean(key);

/** Where and when this page load started. The SDK loads later, possibly after a client-side navigation. */
const pageStart = typeof window === "undefined" ? undefined : { url: window.location.href, at: new Date() };

let landing: Attribution | undefined;
let landed = false;

/**
 * Reads the landing URL's UTMs and the referrer's domain once per page load and keeps them in memory (no cookies or
 * storage, except the QA tag below). In-app navigations keep them; the preview request sends them so the kit remembers
 * where the buyer came from.
 */
export function rememberFirstTouch() {
  if (landed) return;
  landed = true;
  landing = readLandingAttribution(window.location, document.referrer);
  if (rememberTestVisit(landing?.is_test === true)) landing = { ...landing, is_test: true };
}

const TEST_VISIT_KEY = "launchloop:is_test";

/**
 * QA traffic stays QA for the rest of the tab: a QA-tagged landing is kept in sessionStorage, so a reload or the trip
 * to Stripe Checkout and back still counts as test. Nothing is written for any other visit.
 */
function rememberTestVisit(tagged: boolean): boolean {
  try {
    if (tagged) sessionStorage.setItem(TEST_VISIT_KEY, "1");
    return tagged || sessionStorage.getItem(TEST_VISIT_KEY) === "1";
  } catch {
    return tagged;
  }
}

export const firstTouch = (): Attribution | undefined => landing;

/** This tab landed on a QA-tagged URL (?qa=1 or utm_source=qa): every event it sends carries is_test: true. */
export const isTestVisit = (): boolean => landing?.is_test === true;

let client: Promise<PostHog | undefined> | undefined;
let pageLoad: Promise<void> | undefined;

/** Resolves once the window has loaded and the browser has had an idle moment: when the SDKs load unless something needs them sooner. */
export function afterPageLoad(): Promise<void> {
  pageLoad ??= new Promise((resolve) => {
    const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(() => resolve(), { timeout: 2000 }) : setTimeout(resolve, 1));
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
  return pageLoad;
}

/**
 * The SDK is ~100 KB gzipped, so it isn't in the page's initial scripts: instrumentation-client loads it once the
 * page has loaded, and anything that needs it sooner (an event, a flag, the analytics id) loads it on demand.
 * Resolves undefined when analytics is off or the SDK fails to load.
 */
export function loadAnalytics(): Promise<PostHog | undefined> {
  if (!key || !pageStart) return Promise.resolve(undefined);
  client ??= import("posthog-js").then(
    ({ default: posthog }) => {
      initAnalytics(posthog, key, pageStart);
      return posthog;
    },
    () => undefined,
  );
  return client;
}

let pageId: string | undefined;

/**
 * This page's anonymous id, settled before the SDK loads so the preview request (which mustn't wait for
 * the SDK) carries the id the page's events will use. Page memory only, like the rest of the identity:
 * `?aid=` when we caused the page load, else a new id for this page load. Undefined when analytics is off.
 */
export function pageAnalyticsId(): string | undefined {
  if (!key || !pageStart) return undefined;
  const handoff = new URL(pageStart.url).searchParams.get(ANALYTICS_ID_PARAM);
  pageId ??= isAnalyticsId(handoff) ? handoff : globalThis.crypto?.randomUUID?.();
  return pageId;
}

/**
 * Cookieless: identity lives in page memory only, so nothing is written to cookies or
 * storage and no consent banner is needed. The trade-off is a new anonymous id per full
 * page load. Where we cause the reload (magic link, Stripe Checkout and back) the previous
 * page's id rides along as `?aid=` and is reused here, so flag variants don't re-roll
 * mid-purchase. A manual reload or a new visit still gets a fresh id.
 */
function initAnalytics(posthog: PostHog, token: string, start: { url: string; at: Date }) {
  if (posthog.__loaded) return;
  const params = new URL(start.url).searchParams;
  const id = pageAnalyticsId();
  posthog.init(token, {
    ...(id ? { bootstrap: { distinctID: id } } : {}),
    api_host: POSTHOG_PROXY_PATH,
    ui_host: posthogUiHost(),
    defaults: "2026-08-30",
    persistence: "memory",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    // Clicks are captured explicitly, in the home hero only (hero_clicked): autocapture would depend on the project's
    // remote config, and anywhere else on the site would be out of scope.
    autocapture: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    disable_session_recording: true,
    disable_surveys: true,
    before_send: scrubEvent,
    // Runs before the SDK's own pageview, which is for the URL it finds at init.
    loaded: (ph) => {
      ph.register({
        env: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
        // posthog-js already drops events when this is true unless its bot filter is turned off.
        is_webdriver: navigator.webdriver === true,
        ...(params.get(QA_PARAM) === "1" ? { qa: true } : {}),
        // Super properties last for the page, so client navigations keep it.
        ...(isTestVisit() ? { is_test: true } : {}),
      });
      if (window.location.href !== start.url) recordLanding(ph, start);
    },
  });
}

/**
 * The visitor navigated client-side before the SDK loaded. The SDK reads UTMs and $current_url from the URL at init,
 * so record the landing pageview as it happened and keep its UTMs on every later event, as an early init would have.
 */
function recordLanding(posthog: PostHogInterface, start: { url: string; at: Date }) {
  const url = new URL(start.url);
  const utm = Object.fromEntries([...url.searchParams].filter(([name]) => name.startsWith("utm_")));
  if (Object.keys(utm).length) posthog.register(utm);
  posthog.capture("$pageview", { $current_url: start.url, $pathname: url.pathname, $host: url.host }, { timestamp: start.at });
}

/** What useExperiment served on this page load, for experiments posthog-js buckets on this page's own id. */
const servedOnPage = new Map<ExperimentKey, Served>();

export function rememberServed(key: ExperimentKey, served: Served) {
  servedOnPage.set(key, served);
}

/**
 * posthog-js tags every event with `$feature/<key>` from its own flag evaluation for this page's id,
 * which needn't be what the page served (the promo is bucketed on the kit; a timeout serves control).
 * So those are replaced with what this page did serve through useExperiment (`fallback/<key>` for a
 * fallback, as on the server's checkout events): preview_started can be split by the hero variant shown.
 * Experiments the page didn't serve travel only on exposures and the server's events, which set them explicitly.
 */
function withServedExperiments(event: CaptureResult): CaptureResult["properties"] {
  if (event.event === "$feature_flag_called") return event.properties;
  const properties = { ...event.properties };
  for (const key of Object.values(EXPERIMENTS)) delete properties[`$feature/${key}`];
  const served = [...servedOnPage];
  const variants = Object.fromEntries(served.map(([key, s]) => [key, s.variant]));
  return { ...properties, ...featureProperties(variants, served.filter(([, s]) => s.fallback).map(([key]) => key)) };
}

function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: scrubProperties(withServedExperiments(event)),
    ...(event.$set ? { $set: scrubProperties(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: scrubProperties(event.$set_once) } : {}),
  };
}

export function track<E extends keyof ClientEvents>(event: E, properties: ClientEvents[E]) {
  void loadAnalytics().then((posthog) => posthog?.capture(event, properties));
}

/**
 * Records what an experiment served on this page, once per view, always with the variant shown:
 * PostHog's $feature_flag_called exposure for an assignment, or flag_fallback for control served
 * without one, which keeps the view out of the experiment.
 */
export function trackServed(key: ExperimentKey, served: Served) {
  if (served.fallback) return track("flag_fallback", { flag: key, variant: served.variant, reason: served.fallback, fallback: true });
  void loadAnalytics().then((posthog) =>
    posthog?.capture("$feature_flag_called", { $feature_flag: key, $feature_flag_response: served.variant, [`$feature/${key}`]: served.variant }),
  );
}

/** This page's anonymous PostHog id, sent with checkout so server events join the same funnel. */
export async function analyticsId(): Promise<string | undefined> {
  return (await loadAnalytics())?.get_distinct_id();
}
