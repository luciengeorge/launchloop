import type { Instrumentation } from "next";
import { captureException, registerErrorHook } from "./lib/observability";

export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
    const browserSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
    registerErrorHook((error, context) => {
      // Browser errors relayed via /api/log are already sent by the client SDK.
      if (browserSentry && context?.stage === "client") return;
      Sentry.captureException(error, { extra: context });
    });
  }
}

// Next.js request errors flow through observability.captureException, which forwards to Sentry via the hook above.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  captureException(error, {
    stage: "next.onRequestError",
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    digest: typeof error === "object" && error && "digest" in error ? String(error.digest) : undefined,
  });
};
