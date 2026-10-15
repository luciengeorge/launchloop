/** Shared by next.config.ts (proxy rewrites), the browser SDK and the server client. Pure: no server-only. */
export const POSTHOG_DEFAULT_HOST = "https://eu.i.posthog.com";

/** First-party path the browser sends events to, rewritten to PostHog. Deliberately not "/posthog" or "/analytics", which blockers match. */
export const POSTHOG_PROXY_PATH = "/lp-relay";

export function posthogHost(raw: string | undefined = process.env.NEXT_PUBLIC_POSTHOG_HOST): string {
  return (raw?.trim() || POSTHOG_DEFAULT_HOST).replace(/\/$/, "");
}

/** PostHog Cloud serves the SDK's lazy-loaded assets from a sibling host (eu-assets.i.posthog.com). */
export function posthogAssetsHost(host: string = posthogHost()): string {
  return host.replace(/^https:\/\/(us|eu)\.i\.posthog\.com$/, "https://$1-assets.i.posthog.com");
}

/** The PostHog app, for links the toolbar opens. */
export function posthogUiHost(host: string = posthogHost()): string {
  return host.replace(/^https:\/\/(us|eu)\.i\.posthog\.com$/, "https://$1.posthog.com");
}
