import { afterEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn(), captureRouterTransitionStart: vi.fn() }));

const DSN = "https://public@o0.ingest.sentry.io/1";

/** sentry-client reads the DSN when it loads, so every case gets a fresh copy after stubbing the env. */
async function freshClient(dsn: string, browserSdk: () => typeof sdk = () => sdk) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", dsn);
  vi.doMock("@/lib/sentry-browser", browserSdk);
  return import("@/lib/sentry-client");
}

afterEach(() => {
  vi.doUnmock("@/lib/sentry-browser");
  vi.unstubAllGlobals();
});

describe("where the browser SDK reports from", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("never initialises on %s", async (hostname) => {
    vi.stubGlobal("location", { hostname });
    const client = await freshClient(DSN);
    expect(await client.loadSentry()).toBeUndefined();
    client.captureClientException(new Error("local"));
    await client.loadSentry();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it.each(["launchloop.dev", "launchloop-git-main-acme.vercel.app"])("initialises on %s, only for our own scripts", async (hostname) => {
    vi.stubGlobal("location", { hostname });
    const client = await freshClient(DSN);
    await client.loadSentry();
    expect(sdk.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: DSN, allowUrls: client.SENTRY_ALLOW_URLS }));
  });

  it("allowUrls accepts launchloop.dev and *.vercel.app scripts, and nothing else", async () => {
    const { SENTRY_ALLOW_URLS } = await freshClient(DSN);
    const allowed = (url: string) => SENTRY_ALLOW_URLS.some((re) => re.test(url));
    for (const url of ["https://launchloop.dev/_next/static/chunks/app.js", "https://www.launchloop.dev/_next/static/chunks/app.js", "https://launchloop-abc123.vercel.app/_next/static/chunks/app.js"]) {
      expect(allowed(url), url).toBe(true);
    }
    for (const url of ["http://localhost:3417/_next/static/chunks/app.js", "chrome-extension://abc/content.js", "https://launchloop.dev.evil.com/x.js", "https://evil.com/launchloop.dev/x.js", "https://vercel.app.evil.com/x.js"]) {
      expect(allowed(url), url).toBe(false);
    }
  });
});

describe("lazily loaded browser Sentry", () => {
  it("queues an error raised before the SDK loads and reports it once the SDK has initialised", async () => {
    const client = await freshClient(DSN);
    const error = new Error("before load");

    expect(client.loadedSentry()).toBeUndefined();
    expect(() => client.captureClientException(error)).not.toThrow();
    expect(sdk.captureException).not.toHaveBeenCalled();

    await client.loadSentry();
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: DSN, tracesSampleRate: 0.1 }));
    expect(sdk.captureException).toHaveBeenCalledWith(error);
    expect(client.loadedSentry()?.captureException).toBe(sdk.captureException);
  });

  it("initialises once however many callers load it", async () => {
    const client = await freshClient(DSN);
    await Promise.all([client.loadSentry(), client.loadSentry(), client.loadSentry()]);
    client.captureClientException(new Error("after load"));
    await client.loadSentry();
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.captureException).toHaveBeenCalledTimes(1);
  });

  it("is a no-op without a DSN", async () => {
    const client = await freshClient("");
    expect(() => client.captureClientException(new Error("no dsn"))).not.toThrow();
    expect(await client.loadSentry()).toBeUndefined();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it("never throws or rejects when the SDK chunk fails to load", async () => {
    const client = await freshClient(DSN, () => {
      throw new Error("chunk load failed");
    });
    expect(() => client.captureClientException(new Error("while offline"))).not.toThrow();
    await expect(client.loadSentry()).resolves.toBeUndefined();
    expect(client.loadedSentry()).toBeUndefined();
  });
});
