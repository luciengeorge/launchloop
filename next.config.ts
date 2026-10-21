import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { EXAMPLE_KIT } from "./src/lib/example-kit";
import { POSTHOG_PROXY_PATH, posthogAssetsHost, posthogHost } from "./src/lib/posthog-config";
import { EXAMPLE_KIT_PATH } from "./src/lib/site";

const nextConfig: NextConfig = {
  // Lets the Playwright build live alongside a running dev server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  cacheComponents: true,
  partialPrefetching: true,
  // Kit images are rendered from API routes, server actions and pages (via the ZIP); all need the fonts.
  outputFileTracingIncludes: { "/*": ["./assets/fonts/*.ttf"] },
  redirects() {
    return [
      { source: "/product-hunt-tagline-checker", destination: "/tools/product-hunt-tagline-checker", permanent: true },
      { source: "/og-preview", destination: "/tools/og-preview", permanent: true },
      // The example kit isn't a stored kit, so /kit/<its id> would render the kit page's not-found shell with a 200.
      { source: `/kit/${EXAMPLE_KIT.id}`, destination: EXAMPLE_KIT_PATH, permanent: true },
    ];
  },
  // First-party proxy for PostHog so ad blockers don't drop conversion events.
  rewrites() {
    return [
      { source: `${POSTHOG_PROXY_PATH}/static/:path*`, destination: `${posthogAssetsHost()}/static/:path*` },
      { source: `${POSTHOG_PROXY_PATH}/array/:path*`, destination: `${posthogAssetsHost()}/array/:path*` },
      { source: `${POSTHOG_PROXY_PATH}/:path*`, destination: `${posthogHost()}/:path*` },
    ];
  },
  // PostHog's API paths end in a slash; the default redirect would break them.
  skipTrailingSlashRedirect: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN is set; without it the build still succeeds, with minified stack traces.
export default withSentryConfig(nextConfig, {
  org: "lucien-jp",
  project: "launchloop",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
