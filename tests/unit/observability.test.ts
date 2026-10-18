import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ captureException: vi.fn(), flush: vi.fn(async () => true), addBreadcrumb: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);
vi.mock("next/server", () => ({ after: vi.fn() }));

const { captureExceptionThrottled } = await import("@/lib/observability");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-18T09:00:00Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.useRealTimers());

describe("captureExceptionThrottled", () => {
  it("sends one event per key per minute and counts what it skipped", () => {
    for (let i = 0; i < 5; i++) captureExceptionThrottled("llm.gateway:GatewayInternalServerError:500", new Error("gateway down"), { stage: "llm.gateway" });
    expect(sentry.captureException).toHaveBeenCalledTimes(1);

    captureExceptionThrottled("llm.gateway:TimeoutError", new Error("timed out"), { stage: "llm.gateway" });
    expect(sentry.captureException).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date("2026-10-18T09:01:01Z"));
    captureExceptionThrottled("llm.gateway:GatewayInternalServerError:500", new Error("gateway down"), { stage: "llm.gateway" });
    expect(sentry.captureException).toHaveBeenCalledTimes(3);
    expect(sentry.captureException.mock.calls[2][1].extra).toMatchObject({ suppressedSinceLastReport: 4, throttleKey: "llm.gateway:GatewayInternalServerError:500" });
  });
});
