import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";

type ErrorContext = Record<string, unknown>;
type ErrorTags = Record<string, string | number | boolean>;

/**
 * Logs the error and sends it to Sentry. Calls the SDK directly: instrumentation.ts is bundled separately
 * from route handlers, so a sink registered there would never see errors caught in a route.
 */
export function captureException(error: unknown, context?: ErrorContext, tags?: ErrorTags) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[launchloop:error] ${message}`, tags ? { ...context, tags } : (context ?? {}), error);
  // Browser errors relayed via /api/log are already sent by the client SDK.
  if (context?.stage === "client" && process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  try {
    const stageTag = typeof context?.stage === "string" ? { stage: context.stage } : undefined;
    Sentry.captureException(error, { extra: context, tags: stageTag || tags ? { ...stageTag, ...tags } : undefined });
    flushAfterResponse();
  } catch {
    // A broken sink must never take the request down with it.
  }
}

const lastReported = new Map<string, number>();
const suppressedSince = new Map<string, number>();

/**
 * captureException at most once per `windowMs` per key, per server instance. Repeats in between are
 * still logged, and the next report says how many were skipped. For errors that arrive in bursts
 * during an outage (the AI Gateway), so one incident doesn't use up the Sentry quota.
 */
export function captureExceptionThrottled(key: string, error: unknown, context?: ErrorContext, windowMs = 60_000) {
  const now = Date.now();
  const last = lastReported.get(key);
  if (last !== undefined && now - last < windowMs) {
    suppressedSince.set(key, (suppressedSince.get(key) ?? 0) + 1);
    console.error(`[launchloop:error] (not sent to Sentry, throttled: ${key}) ${error instanceof Error ? error.message : String(error)}`, context ?? {});
    return;
  }
  lastReported.set(key, now);
  const suppressed = suppressedSince.get(key) ?? 0;
  suppressedSince.delete(key);
  captureException(error, { ...context, throttleKey: key, ...(suppressed ? { suppressedSinceLastReport: suppressed } : {}) });
}

/** Context for the next Sentry event from this request; costs no quota on its own. */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  try {
    Sentry.addBreadcrumb(breadcrumb);
  } catch {
    // Telemetry must never break the request.
  }
}

export function captureMessage(message: string, context?: ErrorContext) {
  console.warn(`[launchloop:warn] ${message}`, context ?? {});
}

/** One JSON line in the runtime logs, so it can be searched and filtered without a log drain. Callers pass no PII. */
export function logEvent(event: string, fields: Record<string, string | number | boolean | null | undefined>) {
  console.info(JSON.stringify({ event, ...fields }));
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
