import { loadAnalytics } from "./lib/analytics";
import { reportClientError } from "./lib/client";
import { captureClientException, loadSentry, loadedSentry } from "./lib/sentry-client";

/**
 * PostHog and Sentry load after the window load event, so their ~240 KB (gzipped) of script doesn't compete with the
 * page's own HTML, CSS, fonts and hydration. Each also loads on demand if it's needed sooner.
 */
function loadSdks() {
  void loadAnalytics().then(() => loadSentry());
}

const idle = (fn: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 1));

if (document.readyState === "complete") idle(loadSdks);
else window.addEventListener("load", () => idle(loadSdks), { once: true });

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
  void loadAnalytics();
  loadedSentry()?.captureRouterTransitionStart(url, navigationType);
}
