import { afterEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ __loaded: false, init: vi.fn(), register: vi.fn(), capture: vi.fn(), get_distinct_id: () => "ph_page" }));
vi.mock("posthog-js", () => ({ default: posthog }));

const TEST_VISIT_KEY = "launchloop:is_test";

function tabStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
}

/** A fresh page load of `url` in a tab with this sessionStorage, as instrumentation-client starts it. */
async function landOn(url: string, storage: Pick<Storage, "getItem" | "setItem"> = tabStorage()) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_unit");
  vi.stubGlobal("window", { location: new URL(url) });
  vi.stubGlobal("document", { referrer: "" });
  vi.stubGlobal("navigator", { webdriver: false });
  vi.stubGlobal("sessionStorage", storage);
  posthog.init.mockImplementation((_token: string, config: { loaded: (ph: typeof posthog) => void }) => config.loaded(posthog));
  const analytics = await import("@/lib/analytics");
  analytics.rememberFirstTouch();
  return analytics;
}

/** The super properties registered when the SDK loads: they go on every event the page sends. */
async function superProperties(analytics: Awaited<ReturnType<typeof landOn>>) {
  await analytics.loadAnalytics();
  return Object.assign({}, ...posthog.register.mock.calls.map(([props]) => props as Record<string, unknown>));
}

afterEach(() => {
  vi.unstubAllGlobals();
  posthog.register.mockClear();
});

describe("QA traffic in the browser", () => {
  it("?qa=1 tags first touch and every event with is_test, and remembers it for the tab", async () => {
    const storage = tabStorage();
    const analytics = await landOn("https://launchloop.dev/?utm_source=hn&qa=1", storage);
    expect(analytics.isTestVisit()).toBe(true);
    expect(analytics.firstTouch()).toEqual({ utm_source: "hn", is_test: true });
    expect(await superProperties(analytics)).toMatchObject({ is_test: true, qa: true });
    expect(storage.data.get(TEST_VISIT_KEY)).toBe("1");
  });

  it("utm_source=qa counts too", async () => {
    const analytics = await landOn("https://launchloop.dev/?utm_source=QA&utm_campaign=smoke");
    expect(analytics.firstTouch()).toEqual({ utm_source: "QA", utm_campaign: "smoke", is_test: true });
    expect(await superProperties(analytics)).toMatchObject({ is_test: true });
  });

  it("a reload or the trip back from checkout in the same tab stays test, though the URL lost the tag", async () => {
    const analytics = await landOn("https://launchloop.dev/kit/abc?paid=1&aid=ph_1", tabStorage({ [TEST_VISIT_KEY]: "1" }));
    expect(analytics.isTestVisit()).toBe(true);
    expect(analytics.firstTouch()).toEqual({ is_test: true });
    expect(await superProperties(analytics)).toMatchObject({ is_test: true });
  });

  it("a real visit stores nothing and sends no is_test", async () => {
    const storage = tabStorage();
    const analytics = await landOn("https://launchloop.dev/?utm_source=hn&qa=0", storage);
    expect(analytics.isTestVisit()).toBe(false);
    expect(analytics.firstTouch()).toEqual({ utm_source: "hn" });
    expect(await superProperties(analytics)).not.toHaveProperty("is_test");
    expect(storage.data.size).toBe(0);
  });

  it("with storage blocked, the tagged page itself still counts as test", async () => {
    const blocked = {
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
    };
    const analytics = await landOn("https://launchloop.dev/?qa=1", blocked);
    expect(analytics.isTestVisit()).toBe(true);
    expect(await superProperties(analytics)).toMatchObject({ is_test: true });
  });

  it("checkout requests from a QA tab say so, so the server tags its events", async () => {
    await landOn("https://launchloop.dev/?qa=1");
    const fetch = vi.fn(async () => Response.json({ url: "/checkout/mock" }));
    vi.stubGlobal("fetch", fetch);
    const { startCheckout } = await import("@/lib/client");
    await startCheckout("kit", "kit_1");
    expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ kitId: "kit_1", isTest: true });
  });
});
