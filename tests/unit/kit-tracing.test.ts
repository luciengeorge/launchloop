import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => {
  const span = { setAttributes: vi.fn(), setAttribute: vi.fn(), setStatus: vi.fn(), end: vi.fn() };
  const scope = { setTag: vi.fn() };
  return {
    span,
    scope,
    addBreadcrumb: vi.fn(),
    captureMessage: vi.fn(),
    flush: vi.fn(async () => true),
    getCurrentScope: vi.fn(() => scope),
    startSpan: vi.fn((_opts: unknown, fn: (s: typeof span) => unknown) => fn(span)),
    startSpanManual: vi.fn((_opts: unknown, fn: (s: typeof span) => unknown) => fn(span)),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => sentry);
vi.mock("@/lib/observability", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

const { errorCodeOf, phase, previewSourceOf, safeInput, traceKitRequest } = await import("@/lib/kit-tracing");
const { beforeBreadcrumb, beforeSendSpan, isKitRequest, tracesSampler } = await import("@/lib/sentry-options");

const sampling = (name: string, extra: Record<string, unknown> = {}) => ({ name, attributes: {}, inheritOrSampleWith: (rate: number) => rate, ...extra });

describe("tracesSampler", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("traces every POST /api/kits and keeps 10% elsewhere", () => {
    expect(tracesSampler(sampling("POST /api/kits"))).toBe(1);
    expect(tracesSampler(sampling("POST", { attributes: { "http.request.method": "POST", "url.path": "/api/kits" } }))).toBe(1);
    expect(tracesSampler(sampling("kits.request"))).toBe(1);
    expect(tracesSampler(sampling("GET /api/kits/abc/status"))).toBe(0.1);
    expect(tracesSampler(sampling("POST /api/checkout"))).toBe(0.1);
    expect(isKitRequest(sampling("GET /api/kits"))).toBe(false);
  });

  it("can be dialled down with SENTRY_KITS_TRACES_SAMPLE_RATE", () => {
    vi.stubEnv("SENTRY_KITS_TRACES_SAMPLE_RATE", "0.25");
    expect(tracesSampler(sampling("POST /api/kits"))).toBe(0.25);
    vi.stubEnv("SENTRY_KITS_TRACES_SAMPLE_RATE", "nonsense");
    expect(tracesSampler(sampling("POST /api/kits"))).toBe(1);
  });
});

describe("URL scrubbing", () => {
  it("strips query strings and fragments from span names and URL attributes, and drops query attributes", () => {
    const span = beforeSendSpan({
      trace_id: "t",
      span_id: "s",
      name: "GET https://my-app.com/dashboard?token=secret#x",
      start_timestamp: 0,
      status: "ok",
      is_segment: false,
      attributes: { "url.full": "https://my-app.com/dashboard?token=secret", "url.query": "?token=secret", "http.request.method": "GET" },
    });
    expect(span.name).toBe("GET https://my-app.com/dashboard");
    expect(span.attributes).toEqual({ "url.full": "https://my-app.com/dashboard", "http.request.method": "GET" });
  });

  it("scrubs breadcrumb URLs", () => {
    expect(beforeBreadcrumb({ category: "fetch", data: { url: "https://x.dev/login/verify?token=abc", status_code: 200 } }).data).toEqual({ url: "https://x.dev/login/verify", status_code: 200 });
  });
});

describe("inputs and error codes", () => {
  it("keeps repo URLs but reduces sites to their origin", () => {
    expect(previewSourceOf("sample")).toBe("sample");
    expect(previewSourceOf("github.com/a/b")).toBe("github");
    expect(safeInput("https://github.com/a/b")).toBe("https://github.com/a/b");
    expect(safeInput("my-app.com/private/path?invite=123")).toBe("https://my-app.com");
  });

  it("maps IngestError codes, and LlmError to ai_busy", () => {
    expect(errorCodeOf(Object.assign(new Error("x"), { code: "site_timeout" }))).toBe("site_timeout");
    expect(errorCodeOf(Object.assign(new Error("x"), { name: "LlmError" }))).toBe("ai_busy");
    expect(errorCodeOf(new TypeError("boom"))).toBe("unknown");
  });

  it("records the error code on a failed phase and rethrows", async () => {
    await expect(phase("ingest.site", "http.client.site", {}, async () => Promise.reject(Object.assign(new Error("slow"), { code: "site_timeout" })))).rejects.toThrow("slow");
    expect(sentry.span.setAttributes).toHaveBeenCalledWith(expect.objectContaining({ "kit.status": "error", "error.code": "site_timeout" }));
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: "ingest.site failed", level: "warning" }));
  });
});

describe("traceKitRequest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it("warns in Sentry once a request passes 50s of a 60s maxDuration", async () => {
    void traceKitRequest({ maxDurationSeconds: 60 }, (trace) => {
      trace.set({ "kit.source": "github" });
      return new Promise(() => {});
    });
    expect(sentry.scope.setTag).toHaveBeenCalledWith("kit.source", "github");
    await vi.advanceTimersByTimeAsync(49_999);
    expect(sentry.captureMessage).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      "Kit preview is close to the function timeout",
      expect.objectContaining({ level: "warning", extra: expect.objectContaining({ elapsedMs: 50_000, maxDurationSeconds: 60, source: "github" }) }),
    );
  });

  it("doesn't warn for a request that finished, and records status, code and duration", async () => {
    await traceKitRequest({ maxDurationSeconds: 60 }, async (trace) => {
      await vi.advanceTimersByTimeAsync(1200);
      trace.end({ status: "error", code: "ai_busy" });
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sentry.captureMessage).not.toHaveBeenCalled();
    expect(sentry.span.setAttributes).toHaveBeenCalledWith({ "kit.status": "error", "error.code": "ai_busy", duration_ms: 1200 });
    expect(sentry.span.setStatus).toHaveBeenCalledWith({ code: 2, message: "ai_busy" });
    expect(sentry.span.end).toHaveBeenCalledTimes(1);
  });
});
