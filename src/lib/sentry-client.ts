import type * as SentrySdk from "@sentry/nextjs";

type Sdk = typeof SentrySdk;

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let sdk: Promise<Sdk | undefined> | undefined;
let ready: Sdk | undefined;

/**
 * The browser SDK (with tracing) is ~130 KB gzipped and costs ~0.5 s of main thread on a throttled phone, so it isn't
 * in the page's initial scripts: instrumentation-client loads it once the page has loaded, and an error loads it early.
 */
export function loadSentry(): Promise<Sdk | undefined> {
  if (!dsn) return Promise.resolve(undefined);
  sdk ??= import("@sentry/nextjs").then(
    (Sentry) => {
      // Errors only: Sentry's global handlers catch uncaught errors and rejections from here on.
      Sentry.init({ dsn, environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV, tracesSampleRate: 0.1 });
      ready = Sentry;
      return Sentry;
    },
    () => undefined,
  );
  return sdk;
}

/** The SDK if it has already loaded, for hooks that must stay synchronous. */
export const loadedSentry = (): Sdk | undefined => ready;

export function captureClientException(error: unknown) {
  void loadSentry().then((Sentry) => Sentry?.captureException(error));
}
