import type * as SentryBrowser from "./sentry-browser";

type Sdk = typeof SentryBrowser;

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let sdk: Promise<Sdk | undefined> | undefined;
let ready: Sdk | undefined;

/**
 * The browser SDK isn't in the page's initial scripts: instrumentation-client loads it once the page has loaded,
 * and an error loads it early.
 */
export function loadSentry(): Promise<Sdk | undefined> {
  if (!dsn) return Promise.resolve(undefined);
  sdk ??= import("./sentry-browser").then(
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
