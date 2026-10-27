import type { CaptureResult, PostHog, PostHogInterface } from "posthog-js";
import { type Attribution, QA_PARAM, readLandingAttribution } from "./attribution";
import { ANALYTICS_ID_PARAM, EXPERIMENTS, featureProperties, isAnalyticsId, type ExperimentKey, type FallbackReason, type Served, type Variant } from "./experiments";
import type { NewsletterPlacement } from "./newsletter";
import type { PAYWALL_EARLY_CTA_FLAG } from "./paywall-cta";
import { POSTHOG_PROXY_PATH, posthogUiHost } from "./posthog-config";
import type { RepoPrefill } from "./repo-cta";
import { scrubProperties } from "./scrub-url";
import { pendingMarkers, readServedMarker } from "./served-marker";
import { SESSION_REPLAY_CONFIG } from "./session-replay";
import type { StartPlan } from "./start-intent";
import type { CheckoutFailureCode, PaywallViewport, UnlockContext } from "./unlock-checkout";

export type PreviewSource = "github" | "site" | "sample";

/**
 * Browser events. Checkout events are captured server-side (see analytics-server.ts) so they carry the Stripe price,
 * and newsletter_subscribed so automated browsers and no-JS posts count.
 */
/** Errors about the link itself, whose alert offers a site URL or the sample app instead. */
export type ErrorCtaCode = "invalid_url" | "repo_not_found" | "repo_private";

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
  /** site_no_content's "Use my GitHub repo instead" button, shown with the error. Never carries the link. */
  repo_cta_shown: { code: "site_no_content"; plan: StartPlan; isLoggedIn: boolean };
  repo_cta_clicked: { code: "site_no_content"; plan: StartPlan; isLoggedIn: boolean; prefill: RepoPrefill };
  /** A button on an invalid_url, repo_not_found or repo_private error: "Try your site URL instead" or "Try a sample app". Never carries the link. */
  error_cta_clicked: { cta: "site_url" | "sample_app"; error_code: ErrorCtaCode; plan: StartPlan; isLoggedIn: boolean };
  /** The visitor tried to send the link that just failed with site_no_content again; the form pointed them at the button. */
  preview_resubmit_blocked: { code: "site_no_content"; plan: StartPlan; isLoggedIn: boolean };
  /**
   * A click on a link, a button or the URL field in the home hero (HomeHero). `label` is the visible text, or the
   * field's label: never what was typed. `link_url` is scrubbed like every URL.
   */
  hero_clicked: { element: "a" | "button" | "input"; label: string; link_url?: string };
  /**
   * Control served without a PostHog assignment (see Served). Not an exposure, so it stays out of the experiment.
   * Also the paywall's early-CTA kill switch (PAYWALL_EARLY_CTA_FLAG) rendered off because PostHog didn't answer.
   */
  flag_fallback: { flag: ExperimentKey | typeof PAYWALL_EARLY_CTA_FLAG; variant: Variant; reason: FallbackReason; fallback: true };
  /**
   * A newsletter form at least half on screen, once per placement per page (useFormViewed). `path` is scrubbed like
   * every URL; the UTMs are the landing's. Never anything typed. The submit is the server's newsletter_subscribed.
   */
  newsletter_form_viewed: { placement: NewsletterPlacement; path: string; utm_source?: string; utm_medium?: string; utm_campaign?: string };
  /** A kit paywall unlock button at least half in view: once per position per page view. */
  unlock_cta_shown: UnlockContext & { viewport: PaywallViewport };
  /** A kit paywall unlock button clicked, or (`retry`) the "Try again" on its checkout error. Sent before /api/checkout. */
  unlock_cta_clicked: UnlockContext & { viewport: PaywallViewport; retry: boolean };
  /** /api/checkout failed for an unlock button (or ?unlock=1 / the code login, as `panel`). Never carries the message. */
  checkout_failed: UnlockContext & { viewport: PaywallViewport; code: CheckoutFailureCode; retry: boolean };
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

let markRequested!: () => void;
/** Settles the first time anything asks for the SDK, without asking for it itself. */
const requested = new Promise<void>((resolve) => (markRequested = resolve));

/**
 * The SDK is ~100 KB gzipped, so it isn't in the page's initial scripts: instrumentation-client loads it once the
 * page has loaded, and anything that needs it sooner (an event, a flag, the analytics id) loads it on demand.
 * Resolves undefined when analytics is off or the SDK fails to load.
 */
export function loadAnalytics(): Promise<PostHog | undefined> {
  markRequested();
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
    // Clicks are sent explicitly, from the home hero only (hero_clicked). posthog-js autocaptures only once the
    // project's remote config allows it, so an allowlist here could silently capture nothing.
    autocapture: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    // Off everywhere; kit pages turn it on (and every other page off) through syncSessionReplay, with these options.
    disable_session_recording: true,
    ...SESSION_REPLAY_CONFIG,
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

export const servedEarlier = (key: ExperimentKey): Served | undefined => servedOnPage.get(key);

/**
 * What the page shows for `key`: what it recorded, else the server-rendered marker (see servedMarker), which is in the
 * HTML before the element hydrates and records it. null: not running; undefined: not known yet.
 */
const servedInPage = (key: ExperimentKey): Served | null | undefined => servedOnPage.get(key) ?? readServedMarker(key);

/** Longest an exposure waits for another experiment the page is still rendering, before it goes with what's known. */
export const EXPOSURE_WAIT_MS = 1500;
const EXPOSURE_POLL_MS = 50;

/** Resolves once no Suspense fallback is waiting on an experiment other than `own` (see pendingMarkers), or after `timeoutMs`. */
function untilRendered(own: ExperimentKey, timeoutMs = EXPOSURE_WAIT_MS): Promise<void> {
  const waiting = () => pendingMarkers().some((key) => key !== own && servedInPage(key) === undefined);
  if (!waiting()) return Promise.resolve();
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const check = () => (!waiting() || Date.now() >= deadline ? resolve() : setTimeout(check, EXPOSURE_POLL_MS));
    setTimeout(check, EXPOSURE_POLL_MS);
  });
}

/**
 * posthog-js tags every event with `$feature/<key>` from its own flag evaluation for this page's id,
 * which needn't be what the page served (the promo is bucketed on the kit; a timeout serves control).
 * So those are replaced with what this page did serve through useExperiment (`fallback/<key>` for a
 * fallback, as on the server's checkout events): preview_started can be split by the hero variant shown.
 * Experiments the page didn't serve travel only on exposures and the server's events, which set them explicitly.
 * An exposure keeps its own flag as sent; the other experiments on it are what this page served too (the
 * headline is assigned on the server, so posthog-js's guess for this page's id can say test while control
 * showed), and only those the page didn't serve keep posthog-js's value. What the page served includes a
 * server-rendered experiment whose element hasn't hydrated yet (servedInPage).
 */
function withServedExperiments(event: CaptureResult): CaptureResult["properties"] {
  const properties = { ...event.properties };
  const exposure = event.event === "$feature_flag_called";
  const own = exposure ? properties.$feature_flag : undefined;
  const served = Object.values(EXPERIMENTS)
    .filter((key) => key !== own)
    .flatMap((key): [ExperimentKey, Served][] => {
      const s = servedInPage(key);
      return s ? [[key, s]] : [];
    });
  const servedKeys = new Set(served.map(([key]) => key));
  for (const key of Object.values(EXPERIMENTS)) {
    if (key !== own && (!exposure || servedKeys.has(key))) delete properties[`$feature/${key}`];
  }
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
 * without one, which keeps the view out of the experiment. `whenLoaded` waits for the SDK to load as it
 * normally would (after the load event, or sooner for an event) instead of loading it now. An exposure also
 * waits, up to EXPOSURE_WAIT_MS, for another experiment the page is still rendering, so it carries what that shows.
 */
export function trackServed(key: ExperimentKey, served: Served, { whenLoaded = false }: { whenLoaded?: boolean } = {}) {
  const send = () => {
    if (served.fallback) return track("flag_fallback", { flag: key, variant: served.variant, reason: served.fallback, fallback: true });
    void Promise.all([loadAnalytics(), untilRendered(key)]).then(([posthog]) =>
      posthog?.capture("$feature_flag_called", { $feature_flag: key, $feature_flag_response: served.variant, [`$feature/${key}`]: served.variant }),
    );
  };
  if (whenLoaded) void requested.then(send);
  else send();
}

/** This page's anonymous PostHog id, sent with checkout so server events join the same funnel. */
export async function analyticsId(): Promise<string | undefined> {
  return (await loadAnalytics())?.get_distinct_id();
}
