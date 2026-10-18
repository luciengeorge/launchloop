import { defineConfig, devices } from "@playwright/test";
import { SERVER_LOG } from "./tests/e2e/server-log";

const PORT = 3418;
const FIXTURE_PORT = 3419;
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Smoke tests run against a production build in full mock mode: no Stripe,
 * Resend or AI Gateway credentials are used even if they exist in .env.local.
 * PostHog is on but points at the fixture server, which serves no flags (every
 * experiment is control); tests force variants by intercepting /lp-relay/flags.
 * Server-side Sentry also points at the fixture server, which records the events.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /newsletter-mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /(home|tagline-checker|og-preview|newsletter-mobile)\.spec\.ts/ },
  ],
  webServer: [
    {
      command: `node tests/fixtures/serve.mjs ${FIXTURE_PORT}`,
      url: `http://127.0.0.1:${FIXTURE_PORT}/`,
      reuseExistingServer: !process.env.CI,
    },
    {
      // The log copy lets tests catch errors Next.js only logs, like Date.now() before a dynamic boundary; stderr keeps it in the reporter.
      command: `rm -rf .data-test && npx next build && npx next start -p ${PORT} 2>&1 | tee ${SERVER_LOG} >&2`,
      url: baseURL,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_DIST_DIR: ".next-test",
        MOCK_MODE: "true",
        STRIPE_SECRET_KEY: "",
        RESEND_API_KEY: "",
        LLM_PROVIDER: "mock",
        AI_GATEWAY_API_KEY: "",
        VERCEL_OIDC_TOKEN: "",
        KV_REST_API_URL: "",
        KV_REST_API_TOKEN: "",
        DATA_DIR: ".data-test",
        INGEST_ALLOW_PRIVATE: "true",
        PREVIEW_RATE_LIMIT_PER_HOUR: "40",
        PREVIEW_RATE_LIMIT_PER_DAY: "60",
        MAGIC_LINK_RATE_LIMIT_PER_IP: "500",
        AUTH_SECRET: "playwright-test-secret",
        MOCK_LLM_FAILURES: "true",
        KIT_RETRY_BACKOFF_MS: "200,400",
        SITE_FETCH_TIMEOUT_MS: "1500",
        GITHUB_API_URL: `http://127.0.0.1:${FIXTURE_PORT}/gh`,
        NEXT_PUBLIC_SITE_URL: baseURL,
        NEXT_PUBLIC_POSTHOG_KEY: "phc_playwright",
        NEXT_PUBLIC_POSTHOG_HOST: `http://127.0.0.1:${FIXTURE_PORT}/ph`,
        // Server errors go to the fixture's fake Sentry; the browser SDK stays off.
        SENTRY_DSN: `http://public@127.0.0.1:${FIXTURE_PORT}/sentry/1`,
        NEXT_PUBLIC_SENTRY_DSN: "",
        SENTRY_TEST_TOKEN: "playwright-sentry-token",
      },
    },
  ],
});
