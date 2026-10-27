import type { PostHog, PostHogConfig } from "posthog-js";
import { isQaLanding } from "./attribution";
import { scrubValue } from "./scrub-url";

/**
 * Masked session replay runs on kit pages only (/kit/<id>). posthog-js is set up with `disable_session_recording: true`
 * (see analytics.ts); syncSessionReplay starts it on the initial load and on client navigations to a kit page, and
 * stops it on the way to anything else. It never starts for QA visits, automated browsers, or a browser that sends
 * Global Privacy Control or Do Not Track. It also needs session replay on in the PostHog project's settings.
 */
export const isKitPath = (pathname: string) => /^\/kit\/[^/]+\/?$/.test(pathname);

/** What the browser says about this visit, read once per decision. */
export interface ReplayEnvironment {
  /** This tab is QA traffic (isTestVisit: it landed with ?qa=1 or utm_source=qa). */
  isTest: boolean;
  webdriver: boolean;
  userAgent: string;
  globalPrivacyControl: boolean;
  doNotTrack: boolean;
}

/** Headless and scripted browsers, and crawlers, that don't set navigator.webdriver. */
const AUTOMATION = /headless|phantomjs|puppeteer|playwright|selenium|lighthouse|bot\b|crawler|spider/i;

export function readReplayEnvironment(isTest: boolean): ReplayEnvironment {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  const dnt = [nav.doNotTrack, (window as Window & { doNotTrack?: string }).doNotTrack, nav.msDoNotTrack];
  return {
    isTest,
    webdriver: nav.webdriver === true,
    userAgent: nav.userAgent ?? "",
    globalPrivacyControl: nav.globalPrivacyControl === true,
    doNotTrack: dnt.some((value) => value === "1" || value === "yes"),
  };
}

/** Replay may run for this page: a kit page, and none of the reasons never to record. */
export function replayAllowed(url: URL, env: ReplayEnvironment): boolean {
  if (!isKitPath(url.pathname)) return false;
  if (env.isTest || isQaLanding(url.search)) return false;
  if (env.webdriver || AUTOMATION.test(env.userAgent)) return false;
  return !env.globalPrivacyControl && !env.doNotTrack;
}

type Recorder = Pick<PostHog, "startSessionRecording" | "stopSessionRecording" | "sessionRecordingStarted">;

/** Starts recording on a page it's allowed on, stops it on any other. */
export function syncSessionReplay(posthog: Recorder, url: URL, env: ReplayEnvironment) {
  if (!replayAllowed(url, env)) posthog.stopSessionRecording();
  else if (!posthog.sessionRecordingStarted()) posthog.startSessionRecording();
}

/**
 * For a client navigation (onRouterTransitionStart, which runs before the URL changes): leaving for a page that isn't
 * allowed stops recording at once, before the new page renders; arriving at a kit page starts it only once the
 * address bar shows that page, so nothing from the page being left is recorded. `currentPath` defaults to the window's.
 */
export function onReplayNavigation(posthog: Recorder, target: URL, env: ReplayEnvironment, { currentPath = () => window.location.pathname, timeoutMs = 10_000 } = {}) {
  if (!replayAllowed(target, env)) return posthog.stopSessionRecording();
  const deadline = Date.now() + timeoutMs;
  const check = () => {
    if (currentPath() === target.pathname) return syncSessionReplay(posthog, target, env);
    if (Date.now() < deadline) requestAnimationFrame(check);
  };
  check();
}

/** The private kit id of the kit page being recorded, if this is one. */
const currentKitId = () => /^\/kit\/([^/]+)/.exec(globalThis.location?.pathname ?? "")?.[1];

/** A private kit link in any attribute value (href, src, action, data-*): only the route shape is kept, like every analytics URL. */
const KIT_LINK = /(\/(?:kit|account\/kits|api\/kits)\/)[^/?#"'\s]+/g;

/** Attributes that carry words a person reads (or a screen reader speaks): masked like text, so "all text is masked" holds. */
const TEXT_ATTRIBUTES = new Set(["alt", "title", "aria-label", "aria-description", "aria-roledescription", "aria-valuetext", "aria-placeholder", "placeholder", "content", "label", "value"]);

export function maskReplayAttribute(name: string, value: string): string {
  if (TEXT_ATTRIBUTES.has(name.toLowerCase())) return value.replace(/\S/g, "*");
  const id = currentKitId();
  const scrubbed = value.replace(KIT_LINK, "$1[id]");
  return id ? scrubbed.split(id).join("[id]") : scrubbed;
}

/**
 * posthog-js options for the recorder, used only while it runs (on a kit page). All text and every input are masked;
 * media, SVG and iframes are blocked; no console, network, headers, bodies or canvas. URLs the recording keeps (the
 * page address and any network entry) are scrubbed like analytics URLs, so private kit links never reach a replay.
 */
export const SESSION_REPLAY_CONFIG = {
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "*",
    blockSelector: "img, picture, video, canvas, svg, iframe",
    maskAttributeFn: maskReplayAttribute,
    recordHeaders: false,
    recordBody: false,
    recordCrossOriginIframes: false,
    captureCanvas: { recordCanvas: false },
    maskCapturedNetworkRequestFn: (request) => ({ ...request, name: request.name ? scrubValue(request.name) : request.name }),
  },
  enable_recording_console_log: false,
  // Network timing in replays only: web vitals stay as the project's settings have them.
  capture_performance: { network_timing: false },
} satisfies Partial<PostHogConfig>;
