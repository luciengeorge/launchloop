import type { CaptureResult, PostHog, PostHogInterface } from "posthog-js";
import { ANALYTICS_ID_PARAM, isAnalyticsId } from "./experiments";
import { POSTHOG_PROXY_PATH, posthogUiHost } from "./posthog-config";
import { scrubProperties } from "./scrub-url";
import type { StartPlan } from "./start-intent";

export type PreviewSource = "github" | "site" | "sample";

/** Browser events. Checkout events are captured server-side (see analytics-server.ts) so they carry the Stripe price. */
export interface ClientEvents {
  preview_started: { source: PreviewSource; plan: StartPlan; isLoggedIn: boolean };
  preview_completed: { kitId: string; source: PreviewSource; plan: StartPlan; isLoggedIn: boolean; durationMs: number };
  preview_failed: { code: string; source: PreviewSource; plan: StartPlan; isLoggedIn: boolean; durationMs: number };
}

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export const analyticsEnabled = Boolean(key);

/** Where and when this page load started. The SDK loads later, possibly after a client-side navigation. */
const landing = typeof window === "undefined" ? undefined : { url: window.location.href, at: new Date() };

let client: Promise<PostHog | undefined> | undefined;

/**
 * The SDK is ~100 KB gzipped, so it isn't in the page's initial scripts: instrumentation-client loads it once the
 * page has loaded, and anything that needs it sooner (an event, a flag, the analytics id) loads it on demand.
 * Resolves undefined when analytics is off or the SDK fails to load.
 */
export function loadAnalytics(): Promise<PostHog | undefined> {
  if (!key || !landing) return Promise.resolve(undefined);
  client ??= import("posthog-js").then(
    ({ default: posthog }) => {
      initAnalytics(posthog, key, landing);
      return posthog;
    },
    () => undefined,
  );
  return client;
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
  const handoff = new URL(start.url).searchParams.get(ANALYTICS_ID_PARAM);
  posthog.init(token, {
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
    // Runs before the SDK's own pageview, which is for the URL it finds at init.
    loaded: (ph) => {
      ph.register({ env: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development" });
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

function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: scrubProperties(event.properties),
    ...(event.$set ? { $set: scrubProperties(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: scrubProperties(event.$set_once) } : {}),
  };
}

export function track<E extends keyof ClientEvents>(event: E, properties: ClientEvents[E]) {
  void loadAnalytics().then((posthog) => posthog?.capture(event, properties));
}

/** This page's anonymous PostHog id, sent with checkout so server events join the same funnel. */
export async function analyticsId(): Promise<string | undefined> {
  return (await loadAnalytics())?.get_distinct_id();
}
