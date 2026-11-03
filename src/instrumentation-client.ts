import { afterPageLoad, isTestVisit, loadAnalytics, rememberFirstTouch } from "./lib/analytics";
import { reportClientError } from "./lib/client";
import { captureClientException, loadSentry, loadedSentry } from "./lib/sentry-client";
import { onReplayNavigation, readReplayEnvironment, syncSessionReplay } from "./lib/session-replay";

// Synchronous and SDK-free: the landing URL is read before any in-app navigation can change it.
rememberFirstTouch();

/**
 * PostHog and Sentry load after the window load event, so their ~160 KB (gzipped) of script doesn't compete with the
 * page's own HTML, CSS, fonts and hydration. Each also loads on demand if it's needed sooner.
 */
function loadSdks() {
  void loadAnalytics().then((posthog) => {
    // The page this tab loaded on: masked replay starts here only if it's a kit page (see session-replay.ts).
    if (posthog) syncSessionReplay(posthog, new URL(window.location.href), readReplayEnvironment(isTestVisit()));
    return loadSentry();
  });
}

void afterPageLoad().then(loadSdks);

/** Once the SDK has loaded, its own global handlers report uncaught errors. Before that, hand them over. */
function report(error: Error) {
  reportClientError(error);
  if (!loadedSentry()) captureClientException(error);
}

window.addEventListener("error", (event) => {
  if (event.error instanceof Error) report(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  report(reason instanceof Error ? reason : new Error(String(reason)));
});

export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse") {
  // The visitor is already moving around: don't wait for load to start counting.
  void loadAnalytics().then((posthog) => {
    if (posthog) onReplayNavigation(posthog, new URL(url, window.location.href), readReplayEnvironment(isTestVisit()));
  });
  loadedSentry()?.captureRouterTransitionStart(url, navigationType);
}
