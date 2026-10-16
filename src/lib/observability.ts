import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";

type ErrorContext = Record<string, unknown>;

/**
 * Logs the error and sends it to Sentry. Calls the SDK directly: instrumentation.ts is bundled separately
 * from route handlers, so a sink registered there would never see errors caught in a route.
 */
export function captureException(error: unknown, context?: ErrorContext) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[launchloop:error] ${message}`, context ?? {}, error);
  // Browser errors relayed via /api/log are already sent by the client SDK.
  if (context?.stage === "client" && process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  try {
    Sentry.captureException(error, { extra: context, tags: typeof context?.stage === "string" ? { stage: context.stage } : undefined });
    flushAfterResponse();
  } catch {
    // A broken sink must never take the request down with it.
  }
}

export function captureMessage(message: string, context?: ErrorContext) {
  console.warn(`[launchloop:warn] ${message}`, context ?? {});
}

/** A serverless instance can be frozen as soon as the response is sent, taking queued events with it. */
function flushAfterResponse() {
  try {
    after(() => Sentry.flush(2000));
  } catch {
    // Outside a request (build, scripts): nothing will freeze us, so a background flush is enough.
    void Sentry.flush(2000);
  }
}
