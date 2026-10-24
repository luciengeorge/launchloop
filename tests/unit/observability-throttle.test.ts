import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ sentryCapture: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: m.sentryCapture, flush: vi.fn(async () => true) }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { captureExceptionThrottled, normaliseErrorMessage, suppressedKeyCount, throttledKeyCount } = await import("@/lib/observability");

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
});

describe("captureExceptionThrottled", () => {
  it("prunes keys whose window has passed, so the map doesn't grow with every distinct error", () => {
    for (let i = 0; i < 50; i++) captureExceptionThrottled(`prune-test:${"x".repeat(i)}`, new Error("e"), undefined, 1000);
    expect(throttledKeyCount()).toBe(50);
    vi.advanceTimersByTime(1000);
    captureExceptionThrottled("prune-test:next", new Error("e"), undefined, 1000);
    expect(throttledKeyCount()).toBe(1);
  });

  it("skipped counts wait for their key's next report, but at most 200 keys' worth are kept", () => {
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    for (let i = 0; i < 250; i++) {
      captureExceptionThrottled(`cap-test:${i}`, new Error("e"), undefined, 1000);
      captureExceptionThrottled(`cap-test:${i}`, new Error("e"), undefined, 1000);
    }
    vi.advanceTimersByTime(1000);
    captureExceptionThrottled("cap-test:next", new Error("e"), undefined, 1000);
    expect(suppressedKeyCount()).toBe(200);
    expect(throttledKeyCount()).toBe(1);
  });

  it("keeps keys still inside their window, throttled; after the window the key reports again with the count it skipped", () => {
    m.sentryCapture.mockClear();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    captureExceptionThrottled("window-test", new Error("a"), undefined, 1000);
    captureExceptionThrottled("window-test", new Error("a"), undefined, 1000);
    vi.advanceTimersByTime(500);
    captureExceptionThrottled("other-window-test", new Error("b"), undefined, 1000);
    captureExceptionThrottled("window-test", new Error("a"), undefined, 1000);
    expect(m.sentryCapture).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(500);
    captureExceptionThrottled("window-test", new Error("a"), undefined, 1000);
    expect(m.sentryCapture).toHaveBeenCalledTimes(3);
    expect(throttledKeyCount()).toBe(2);
  });
});

describe("normaliseErrorMessage", () => {
  it.each([
    ["fetch failed for https://cdn.example.com/a.png?x=1 after 3 tries", "fetch failed for <url> after # tries"],
    ["kit 9okQ31abcdef12 not found", "kit <id> not found"],
    ["row 550e8400-e29b-41d4-a716-446655440000 missing", "row <id> missing"],
    ["took 1534.2ms\n\tat foo", "took #ms at foo"],
    ["Cannot read properties of undefined (reading 'width')", "Cannot read properties of undefined (reading 'width')"],
  ])("%j → %j", (message, normalised) => {
    expect(normaliseErrorMessage(new Error(message))).toBe(normalised);
  });

  it("truncates to 80 characters and takes non-Error values", () => {
    expect(normaliseErrorMessage(new Error("a ".repeat(100)))).toHaveLength(80);
    expect(normaliseErrorMessage("plain string 42")).toBe("plain string #");
  });
});
