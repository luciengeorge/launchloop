import "server-only";
import * as Sentry from "@sentry/nextjs";
import { captureMessage } from "./observability";
import { KIT_REQUEST_SPAN } from "./sentry-options";

export type PreviewSource = "github" | "site" | "sample";
type Attributes = Record<string, string | number | boolean | undefined>;

export const previewSourceOf = (input: string): PreviewSource =>
  input.trim().toLowerCase() === "sample" ? "sample" : /github\.com/i.test(input) ? "github" : "site";

/** What telemetry may say about a pasted input: repo URLs are public, but a site's path and query can be private, so sites go as origin only. */
export function safeInput(input: string): string {
  const source = previewSourceOf(input);
  if (source !== "site") return input.trim().slice(0, 200);
  try {
    return new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`).origin;
  } catch {
    return "[unparseable]";
  }
}

/** The kit error code for a failure: IngestError carries one, and an LlmError reaches the visitor as ai_busy. */
export function errorCodeOf(error: unknown): string {
  if (error instanceof Error && error.name === "LlmError") return "ai_busy";
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "unknown";
}

const breadcrumb = (message: string, data?: Attributes, level: Sentry.SeverityLevel = "info") =>
  Sentry.addBreadcrumb({ category: "kits", message, level, data });

/** One step of a preview (rate limit, GitHub/site fetch, LLM call, DB write) as a child span with breadcrumbs either side. */
export async function phase<T>(name: string, op: string, attributes: Attributes, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  breadcrumb(`${name} started`, attributes);
  return Sentry.startSpan({ name, op, attributes }, async (span) => {
    try {
      const result = await fn();
      const durationMs = Date.now() - startedAt;
      span.setAttributes({ "kit.status": "ok", duration_ms: durationMs });
      breadcrumb(`${name} ok`, { durationMs });
      return result;
    } catch (error) {
      const code = errorCodeOf(error);
      const durationMs = Date.now() - startedAt;
      span.setAttributes({ "kit.status": "error", "error.code": code, "error.name": error instanceof Error ? error.name : typeof error, duration_ms: durationMs });
      span.setStatus({ code: 2, message: code });
      breadcrumb(`${name} failed`, { code, durationMs }, "warning");
      throw error;
    }
  });
}

export interface KitRequestTrace {
  /** Adds attributes to the request span. `kit.source` also becomes a tag on any error captured during the request. */
  set(attributes: Attributes): void;
  /** Ends the request span. Safe to call more than once; only the first call counts. */
  end(outcome: { status: "ok" } | { status: "error"; code: string }): void;
}

/** A normal preview takes about 12s; the 300s maxDuration is headroom, so warn long before it. */
export const PREVIEW_SLOW_WARNING_MS = 60_000;

/**
 * Wraps a whole POST /api/kits request, including the part that keeps streaming after the handler returns, in one
 * span. Warns in Sentry if the request is still running after PREVIEW_SLOW_WARNING_MS, whatever the maxDuration.
 */
export function traceKitRequest<T>(opts: { maxDurationSeconds: number }, fn: (trace: KitRequestTrace) => Promise<T>): Promise<T> {
  return Sentry.startSpanManual({ name: KIT_REQUEST_SPAN, op: "kits.request", attributes: { "kit.max_duration_s": opts.maxDurationSeconds } }, (span) => {
    // The span's own forked scope, so tags reach errors captured anywhere inside the request.
    const scope = Sentry.getCurrentScope();
    const startedAt = Date.now();
    let source: string | undefined;
    let ended = false;
    breadcrumb("request started");

    const timer = setTimeout(() => {
      if (ended) return;
      const context = { stage: "api.kits.timeout_risk", elapsedMs: Date.now() - startedAt, maxDurationSeconds: opts.maxDurationSeconds, source };
      captureMessage("Kit preview slow (>60s)", context);
      span.setAttribute("kit.timeout_risk", true);
      Sentry.captureMessage("Kit preview slow (>60s)", { level: "warning", tags: { stage: context.stage }, extra: context });
      void Sentry.flush(2000);
    }, PREVIEW_SLOW_WARNING_MS);
    timer.unref?.();

    const trace: KitRequestTrace = {
      set(attributes) {
        span.setAttributes(attributes);
        if (typeof attributes["kit.source"] === "string") {
          source = attributes["kit.source"];
          scope.setTag("kit.source", source);
        }
      },
      end(outcome) {
        if (ended) return;
        ended = true;
        clearTimeout(timer);
        const durationMs = Date.now() - startedAt;
        span.setAttributes({ "kit.status": outcome.status, "error.code": outcome.status === "error" ? outcome.code : undefined, duration_ms: durationMs });
        if (outcome.status === "error") span.setStatus({ code: 2, message: outcome.code });
        breadcrumb(`request ${outcome.status}`, { durationMs, ...(outcome.status === "error" ? { code: outcome.code } : {}) }, outcome.status === "ok" ? "info" : "warning");
        span.end();
      },
    };

    return fn(trace).catch((error: unknown) => {
      trace.end({ status: "error", code: errorCodeOf(error) });
      throw error;
    });
  });
}
