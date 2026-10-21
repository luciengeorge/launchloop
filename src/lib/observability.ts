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

/** When each key last reached Sentry, and the window it was throttled for. */
const lastReported = new Map<string, { at: number; windowMs: number }>();
const suppressedSince = new Map<string, number>();

/** Skipped counts wait for their key's next report; past this many keys the oldest count is dropped. */
const MAX_SUPPRESSED_KEYS = 200;

/** Keys still inside their window; expired ones are pruned on every call, so the map can't grow forever. */
export const throttledKeyCount = () => lastReported.size;
export const suppressedKeyCount = () => suppressedSince.size;

function pruneExpired(now: number) {
  for (const [key, { at, windowMs }] of lastReported) if (now - at >= windowMs) lastReported.delete(key);
  for (const key of suppressedSince.keys()) {
    if (suppressedSince.size <= MAX_SUPPRESSED_KEYS) break;
    suppressedSince.delete(key);
  }
}

/**
 * An error's message as a throttle key part: URLs, ids and numbers replaced, whitespace collapsed, at most 80 chars,
 * so one bug repeating with a different URL or count shares a key and two different bugs don't.
 */
export function normaliseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/\b[a-z][a-z\d+.-]*:\/\/\S+/gi, "<url>")
    .replace(/\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/gi, "<id>")
    .replace(/\b(?=[\w-]*\d)[\w-]{12,}\b/g, "<id>")
    .replace(/\d+(\.\d+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * captureException at most once per `windowMs` per key, per server instance. Repeats in between are
 * still logged, and the next report says how many were skipped. For errors that arrive in bursts
 * during an outage (the AI Gateway), so one incident doesn't use up the Sentry quota.
 */
export function captureExceptionThrottled(key: string, error: unknown, context?: ErrorContext, windowMs = 60_000) {
  const now = Date.now();
  pruneExpired(now);
  const last = lastReported.get(key)?.at;
  if (last !== undefined && now - last < windowMs) {
    suppressedSince.set(key, (suppressedSince.get(key) ?? 0) + 1);
    console.error(`[launchloop:error] (not sent to Sentry, throttled: ${key}) ${error instanceof Error ? error.message : String(error)}`, context ?? {});
    return;
  }
  lastReported.set(key, { at: now, windowMs });
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
