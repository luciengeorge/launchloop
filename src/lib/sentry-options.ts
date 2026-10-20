import type { Breadcrumb, init } from "@sentry/nextjs";

type InitOptions = NonNullable<Parameters<typeof init>[0]>;
type TracesSamplerSamplingContext = Parameters<NonNullable<InitOptions["tracesSampler"]>>[0];
type StreamedSpanJSON = Parameters<NonNullable<InitOptions["beforeSendSpan"]>>[0];

/** Name of the span that wraps a whole POST /api/kits request (see kit-tracing.ts). */
export const KIT_REQUEST_SPAN = "kits.request";

/** Everything except free previews keeps the original 10%. */
const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

/**
 * POST /api/kits is traced at 100% by default. It's capped per IP by resolvedPreviewLimits() (src/lib/site.ts), each preview
 * already costs two or more LLM calls, and a trace is about ten spans, so preview volume (and span volume) stays small
 * while every slow or failed preview gets a full trace. SENTRY_KITS_TRACES_SAMPLE_RATE dials it down if traffic grows.
 */
function kitsSampleRate(): number {
  const raw = Number(process.env.SENTRY_KITS_TRACES_SAMPLE_RATE);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 && process.env.SENTRY_KITS_TRACES_SAMPLE_RATE?.trim() ? raw : 1;
}

const pathOf = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value) return undefined;
  try {
    return new URL(value, "http://x").pathname;
  } catch {
    return undefined;
  }
};

/** The free-preview endpoint only: GET /api/kits/[id]/status is polled every second, so it stays at the default rate. */
export function isKitRequest(ctx: Pick<TracesSamplerSamplingContext, "name" | "attributes" | "normalizedRequest">): boolean {
  if (ctx.name === KIT_REQUEST_SPAN) return true;
  const [nameMethod, namePath] = ctx.name.split(" ");
  const attrs = ctx.attributes ?? {};
  const method = String(ctx.normalizedRequest?.method ?? attrs["http.request.method"] ?? attrs["http.method"] ?? nameMethod ?? "").toUpperCase();
  if (method !== "POST") return false;
  const path = pathOf(ctx.normalizedRequest?.url) ?? pathOf(attrs["url.path"]) ?? pathOf(attrs["http.target"]) ?? pathOf(attrs["http.route"]) ?? pathOf(namePath);
  return path === "/api/kits" || path === "/api/kits/";
}

export function tracesSampler(ctx: TracesSamplerSamplingContext): number {
  return isKitRequest(ctx) ? kitsSampleRate() : ctx.inheritOrSampleWith(DEFAULT_TRACES_SAMPLE_RATE);
}

const URL_IN_TEXT = /\bhttps?:\/\/[^\s"'<>]+/gi;

/** Drops query strings and fragments: on fetched sites and auth/checkout links they can carry tokens or private ids. */
export function stripUrlSecrets(text: string): string {
  return text.replace(URL_IN_TEXT, (url) => url.replace(/[?#].*$/, ""));
}

const URLISH_ATTRIBUTE = /(^|\.)(url|full|target|query)$|^http\.url$|^url\.full$/;

/** Outgoing fetches to a pasted site are traced automatically; keep their URLs to origin + path. */
export function beforeSendSpan(span: StreamedSpanJSON): StreamedSpanJSON {
  const attributes: StreamedSpanJSON["attributes"] = {};
  for (const [key, value] of Object.entries(span.attributes ?? {})) {
    if (typeof value !== "string" || !URLISH_ATTRIBUTE.test(key)) attributes[key] = value;
    else if (/(^|\.)query$/.test(key)) continue;
    else attributes[key] = stripUrlSecrets(value);
  }
  return { ...span, name: stripUrlSecrets(span.name), attributes };
}

export function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const data = breadcrumb.data ? Object.fromEntries(Object.entries(breadcrumb.data).map(([k, v]) => [k, typeof v === "string" ? stripUrlSecrets(v) : v])) : undefined;
  return { ...breadcrumb, ...(breadcrumb.message ? { message: stripUrlSecrets(breadcrumb.message) } : {}), ...(data ? { data } : {}) };
}

export const serverSentryOptions = { tracesSampler, beforeSendSpan, beforeBreadcrumb };
