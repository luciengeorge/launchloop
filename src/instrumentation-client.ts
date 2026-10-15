import * as Sentry from "@sentry/nextjs";
import { reportClientError } from "./lib/client";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  // Errors only: Sentry's global handlers catch uncaught errors and rejections.
  Sentry.init({ dsn, environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV, tracesSampleRate: 0.1 });
}

window.addEventListener("error", (event) => {
  if (event.error instanceof Error) reportClientError(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  reportClientError(reason instanceof Error ? reason : new Error(String(reason)));
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
