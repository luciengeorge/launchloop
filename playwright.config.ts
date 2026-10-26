import { defineConfig, devices } from "@playwright/test";
import { SERVER_LOG } from "./tests/e2e/server-log";

const PORT = 3418;
const FIXTURE_PORT = 3419;
/**
 * A second build with HERO_EXPERIMENT=1 for exp_hero_headline's specs; everything else runs with it unset, as in
 * production. Its flag lookup gets 2.5 s instead of 500 ms, so a slow fake PostHog can outlast the 700 ms CSS failsafe.
 */
const HERO_PORT = 3420;
const baseURL = `http://127.0.0.1:${PORT}`;
const heroURL = `http://127.0.0.1:${HERO_PORT}`;
const HERO_SPEC = /hero-(headline|2x2)\.spec\.ts/;
/** A third build with NEWSLETTER_INLINE=on, for the inline newsletter signups; the other builds have the flag off, as production does until it's created. */
const INLINE_PORT = 3421;
const inlineURL = `http://127.0.0.1:${INLINE_PORT}`;
const INLINE_SPEC = /newsletter-inline\.spec\.ts/;

const serverEnv = {
  MOCK_MODE: "true",
  STRIPE_SECRET_KEY: "",
  RESEND_API_KEY: "",
  LLM_PROVIDER: "mock",
  AI_GATEWAY_API_KEY: "",
  VERCEL_OIDC_TOKEN: "",
  KV_REST_API_URL: "",
  KV_REST_API_TOKEN: "",
  INGEST_ALLOW_PRIVATE: "true",
  PREVIEW_RATE_LIMIT_PER_HOUR: "40",
  PREVIEW_RATE_LIMIT_PER_DAY: "60",
  MAGIC_LINK_RATE_LIMIT_PER_IP: "500",
  CHECKOUT_RATE_LIMIT_PER_HOUR: "500",
  AUTH_SECRET: "playwright-test-secret",
  MOCK_LLM_FAILURES: "true",
  KIT_RETRY_BACKOFF_MS: "200,400",
  SITE_FETCH_TIMEOUT_MS: "1500",
  GITHUB_API_URL: `http://127.0.0.1:${FIXTURE_PORT}/gh`,
  NEXT_PUBLIC_POSTHOG_KEY: "phc_playwright",
  NEXT_PUBLIC_POSTHOG_HOST: `http://127.0.0.1:${FIXTURE_PORT}/ph`,
  // Server errors go to the fixture's fake Sentry; the browser SDK stays off.
  SENTRY_DSN: `http://public@127.0.0.1:${FIXTURE_PORT}/sentry/1`,
  NEXT_PUBLIC_SENTRY_DSN: "",
  SENTRY_TEST_TOKEN: "playwright-sentry-token",
};

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
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: [/newsletter-mobile\.spec\.ts/, HERO_SPEC, INLINE_SPEC] },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /(home|tagline-checker|og-preview|newsletter-mobile)\.spec\.ts/ },
    { name: "hero-desktop", use: { ...devices["Desktop Chrome"], baseURL: heroURL }, testMatch: HERO_SPEC },
    { name: "hero-mobile", use: { ...devices["Pixel 7"], baseURL: heroURL }, testMatch: HERO_SPEC },
    { name: "inline-desktop", use: { ...devices["Desktop Chrome"], baseURL: inlineURL }, testMatch: INLINE_SPEC },
    { name: "inline-mobile", use: { ...devices["Pixel 7"], baseURL: inlineURL }, testMatch: INLINE_SPEC },
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
      env: { ...serverEnv, NEXT_DIST_DIR: ".next-test", DATA_DIR: ".data-test", NEXT_PUBLIC_SITE_URL: baseURL },
    },
    {
      command: `rm -rf .data-test-hero && npx next build && npx next start -p ${HERO_PORT}`,
      url: heroURL,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: { ...serverEnv, NEXT_DIST_DIR: ".next-test-hero", DATA_DIR: ".data-test-hero", NEXT_PUBLIC_SITE_URL: heroURL, HERO_EXPERIMENT: "1", HERO_FLAG_TIMEOUT_MS: "2500" },
    },
    {
      command: `rm -rf .data-test-inline && npx next build && npx next start -p ${INLINE_PORT}`,
      url: inlineURL,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: { ...serverEnv, NEXT_DIST_DIR: ".next-test-inline", DATA_DIR: ".data-test-inline", NEXT_PUBLIC_SITE_URL: inlineURL, NEWSLETTER_INLINE: "on" },
    },
  ],
});
