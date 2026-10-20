import { afterEach, describe, expect, it, vi } from "vitest";

const ph = vi.hoisted(() => {
  const state = { id: "" };
  return {
    state,
    sdk: {
      __loaded: false,
      init: vi.fn((_token: string, config: { bootstrap?: { distinctID: string }; loaded?: (sdk: unknown) => void }) => {
        // posthog-js makes its own id when it isn't given one.
        state.id = config.bootstrap?.distinctID ?? `sdk_${Math.random()}`;
      }),
      register: vi.fn(),
      capture: vi.fn(),
      get_distinct_id: () => state.id,
    },
  };
});
vi.mock("posthog-js", () => ({ default: ph.sdk }));

const ID_KEY = "launchloop:aid";

function tabStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
}

const blockedStorage = {
  getItem: () => {
    throw new DOMException("denied", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("denied", "SecurityError");
  },
};

/** A full page load of `url` in a tab with this sessionStorage. */
async function landOn(url: string, storage: Pick<Storage, "getItem" | "setItem">, posthogKey = "phc_unit") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", posthogKey);
  vi.stubGlobal("window", { location: new URL(url) });
  vi.stubGlobal("document", { referrer: "" });
  vi.stubGlobal("navigator", { webdriver: false });
  vi.stubGlobal("sessionStorage", storage);
  const analytics = await import("@/lib/analytics");
  analytics.rememberFirstTouch();
  return analytics;
}

/** The analyticsId the page's checkout request sends. */
async function checkoutAnalyticsId(): Promise<string | undefined> {
  const fetch = vi.fn(async () => Response.json({ url: "/checkout/mock" }));
  vi.stubGlobal("fetch", fetch);
  const { startCheckout } = await import("@/lib/client");
  await startCheckout("kit", "kit_1");
  return (JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string) as { analyticsId?: string }).analyticsId;
}

afterEach(() => {
  vi.unstubAllGlobals();
  ph.sdk.init.mockClear();
});

describe("the anonymous PostHog id lasts for the tab", () => {
  it("survives a full reload: PostHog is bootstrapped with it and checkout sends the id the preview page had", async () => {
    const tab = tabStorage();
    const preview = await landOn("https://launchloop.dev/?utm_source=hn", tab);
    const previewId = preview.pageAnalyticsId();
    expect(previewId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await preview.analyticsId()).toBe(previewId);
    expect(tab.data.get(ID_KEY)).toBe(previewId);

    const reloaded = await landOn("https://launchloop.dev/kit/abc", tab);
    expect(reloaded.pageAnalyticsId()).toBe(previewId);
    expect(await checkoutAnalyticsId()).toBe(previewId);
    expect(ph.sdk.init.mock.calls.at(-1)?.[1]).toMatchObject({ bootstrap: { distinctID: previewId }, persistence: "memory" });
  });

  it("a new tab gets a new id", async () => {
    const first = (await landOn("https://launchloop.dev/", tabStorage())).pageAnalyticsId();
    const second = (await landOn("https://launchloop.dev/", tabStorage())).pageAnalyticsId();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it("?aid= from a page load we caused wins, and becomes the tab's id", async () => {
    const tab = tabStorage({ [ID_KEY]: "old-tab-id" });
    const analytics = await landOn("https://launchloop.dev/kit/abc?saved=1&aid=ph_handoff", tab);
    expect(analytics.pageAnalyticsId()).toBe("ph_handoff");
    expect(tab.data.get(ID_KEY)).toBe("ph_handoff");
  });

  it("ignores a malformed stored or handed-off id", async () => {
    const tab = tabStorage({ [ID_KEY]: "<script>" });
    const id = (await landOn("https://launchloop.dev/?aid=a%20b", tab)).pageAnalyticsId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(tab.data.get(ID_KEY)).toBe(id);
  });

  it("with storage blocked, the id still lasts for the page", async () => {
    const analytics = await landOn("https://launchloop.dev/", blockedStorage);
    const id = analytics.pageAnalyticsId();
    expect(id).toBeTruthy();
    expect(await analytics.analyticsId()).toBe(id);
  });

  it("stores nothing when analytics is off", async () => {
    const tab = tabStorage();
    const analytics = await landOn("https://launchloop.dev/", tab, "");
    expect(analytics.pageAnalyticsId()).toBeUndefined();
    expect(tab.data.size).toBe(0);
  });
});
