import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ captureException: vi.fn(), flush: vi.fn(async () => true), addBreadcrumb: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);
vi.mock("next/server", () => ({ after: vi.fn() }));

const { POST } = await import("@/app/api/log/route");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const headers = {
  "Content-Type": "application/json",
  "user-agent": UA,
  "accept-language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
  "x-vercel-ip-country": "DE",
  "x-forwarded-for": "203.0.113.7",
};
const report = (message: string, extraHeaders: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/log", { method: "POST", headers: { ...headers, ...extraHeaders }, body: JSON.stringify({ message, url: "/pricing" }) }));

const HYDRATION_418 = "Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/log", () => {
  it("passes user agent, language and country to the Sentry context, and no IP", async () => {
    expect((await report(HYDRATION_418)).status).toBe(204);
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    const { extra } = sentry.captureException.mock.calls[0][1];
    expect(extra).toMatchObject({ stage: "client", url: "/pricing", ua: UA, lang: "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7", country: "DE" });
    expect(JSON.stringify(extra)).not.toContain("203.0.113.7");
  });

  it("truncates user agent to 200 and language to 50 characters", async () => {
    await report("boom", { "user-agent": "u".repeat(300), "accept-language": "l".repeat(80) });
    expect(sentry.captureException.mock.calls[0][1].extra).toMatchObject({ ua: "u".repeat(200), lang: "l".repeat(50) });
  });

  it("tags #418 hydration errors with hydration: true", async () => {
    await report(HYDRATION_418);
    expect(sentry.captureException.mock.calls[0][1].tags).toEqual({ stage: "client", hydration: true });
  });

  it("tags React's dev-mode hydration message too", async () => {
    await report("Hydration failed because the server rendered HTML didn't match the client.");
    expect(sentry.captureException.mock.calls[0][1].tags).toMatchObject({ hydration: true });
  });

  it("does not tag a normal error as hydration", async () => {
    await report("TypeError: Cannot read properties of undefined (reading 'map')");
    expect(sentry.captureException.mock.calls[0][1].tags).toEqual({ stage: "client" });
  });

  it("writes the metadata and tag to the server log line even when the client SDK sends the Sentry event", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o0.ingest.sentry.io/0");
    await report(HYDRATION_418);
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Minified React error #418"),
      expect.objectContaining({ ua: UA, lang: "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7", country: "DE", tags: { hydration: true } }),
      expect.any(Error),
    );
  });
});
