import { afterEach, describe, expect, it, vi } from "vitest";

const ph = vi.hoisted(() => {
  const state = { id: "" };
  return {
    state,
    sdk: {
      __loaded: false,
      init: vi.fn((_token: string, config: { bootstrap?: { distinctID: string } }) => {
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

/** Records every write, so a test can prove nothing lands on the device. */
function spyStorage() {
  return { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() };
}

/** A full page load of `url`. */
async function landOn(url: string, posthogKey = "phc_unit") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", posthogKey);
  const session = spyStorage();
  const local = spyStorage();
  vi.stubGlobal("window", { location: new URL(url), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal("document", { referrer: "", cookie: "" });
  vi.stubGlobal("navigator", { webdriver: false });
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("localStorage", local);
  const analytics = await import("@/lib/analytics");
  analytics.rememberFirstTouch();
  return { analytics, session, local };
}

const bodyOf = (fetch: ReturnType<typeof vi.fn>, call = 0) => JSON.parse((fetch.mock.calls[call] as unknown as [string, RequestInit])[1].body as string) as Record<string, unknown>;

afterEach(() => {
  vi.unstubAllGlobals();
  ph.sdk.init.mockClear();
});

describe("the page's anonymous id (memory only)", () => {
  it("the preview request carries it without loading the SDK; the SDK and checkout then use the same id", async () => {
    const { analytics, session, local } = await landOn("https://launchloop.dev/?utm_source=hn");
    const fetch = vi.fn(async () => Response.json({ id: "kit_1", url: "/kit/kit_1" }, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const { createKitWithProgress, startCheckout } = await import("@/lib/client");

    await createKitWithProgress("sample", () => {});
    const previewId = bodyOf(fetch).analyticsId;
    expect(previewId).toMatch(/^[0-9a-f-]{36}$/);
    expect(ph.sdk.init).not.toHaveBeenCalled();

    fetch.mockImplementationOnce(async () => Response.json({ url: "/checkout/mock" }));
    await startCheckout("kit", "kit_1");
    expect(bodyOf(fetch, 1).analyticsId).toBe(previewId);
    expect(ph.sdk.init.mock.calls[0]?.[1]).toMatchObject({ bootstrap: { distinctID: previewId }, persistence: "memory" });
    expect(await analytics.analyticsId()).toBe(previewId);

    // Nothing written to the device for a real visit.
    for (const storage of [session, local]) expect(storage.setItem).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
  });

  it("a full reload gets a new id", async () => {
    const first = (await landOn("https://launchloop.dev/kit/abc")).analytics.pageAnalyticsId();
    const second = (await landOn("https://launchloop.dev/kit/abc")).analytics.pageAnalyticsId();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it("reuses ?aid= from a page load we caused, and ignores a malformed one", async () => {
    expect((await landOn("https://launchloop.dev/checkout/success?kit=k&aid=ph_handoff")).analytics.pageAnalyticsId()).toBe("ph_handoff");
    expect((await landOn("https://launchloop.dev/?aid=a%20b")).analytics.pageAnalyticsId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("is undefined when analytics is off, so the preview sends none", async () => {
    expect((await landOn("https://launchloop.dev/", "")).analytics.pageAnalyticsId()).toBeUndefined();
  });
});
