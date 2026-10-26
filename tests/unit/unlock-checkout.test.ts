import { afterEach, describe, expect, it, vi } from "vitest";
import type { UnlockContext } from "@/lib/unlock-checkout";

const posthog = vi.hoisted(() => ({ __loaded: false, init: vi.fn(), register: vi.fn(), capture: vi.fn(), get_distinct_id: () => "ph_page" }));
vi.mock("posthog-js", () => ({ default: posthog }));

/** A fresh kit page load of `url` at `width`, with the PostHog SDK mocked as instrumentation-client starts it. */
async function landOn(url: string, width = 375) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_unit");
  vi.stubGlobal("window", { location: new URL(url), matchMedia: (query: string) => ({ matches: query === "(min-width: 64rem)" && width >= 1024 }) });
  vi.stubGlobal("document", { referrer: "" });
  vi.stubGlobal("navigator", { webdriver: false });
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: () => {} });
  posthog.init.mockImplementation((_token: string, config: { loaded: (ph: typeof posthog) => void }) => config.loaded(posthog));
  const analytics = await import("@/lib/analytics");
  analytics.rememberFirstTouch();
  return { analytics, unlock: await import("@/lib/unlock-checkout"), client: await import("@/lib/client") };
}

/** Every event the page captured, with the super properties registered so far (what PostHog stores on each). */
async function captured() {
  await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalled());
  const supers = Object.assign({}, ...posthog.register.mock.calls.map(([props]) => props as Record<string, unknown>));
  return posthog.capture.mock.calls.map(([event, properties]) => ({ event: event as string, properties: { ...supers, ...(properties as Record<string, unknown>) } }));
}

const top: UnlockContext = { kitId: "kit_0123456789abcdef", position: "top", earlyCta: true, isLoggedIn: false };

afterEach(() => {
  vi.unstubAllGlobals();
  posthog.register.mockClear();
  posthog.capture.mockClear();
});

describe("unlock CTA events", () => {
  it("unlock_cta_shown and unlock_cta_clicked carry the kit, position, viewport and the early CTA, and is_test on a QA visit", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef?qa=1");
    unlock.trackUnlockShown(top);
    unlock.trackUnlockClicked({ ...top, position: "sticky" }, false);
    const events = await captured();
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalledTimes(2));
    expect(events.map((e) => e.event)).toEqual(["unlock_cta_shown", "unlock_cta_clicked"]);
    expect(events[0].properties).toMatchObject({ ...top, viewport: "mobile", is_test: true });
    expect(events[1].properties).toMatchObject({ ...top, position: "sticky", viewport: "mobile", retry: false, is_test: true });
  });

  it("a real visit sends no is_test; the panel at desktop width says so", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef", 1440);
    unlock.trackUnlockShown({ ...top, position: "panel", earlyCta: false, isLoggedIn: true });
    const [shown] = await captured();
    expect(shown.properties).toMatchObject({ position: "panel", earlyCta: false, isLoggedIn: true, viewport: "desktop" });
    expect(shown.properties).not.toHaveProperty("is_test");
  });
});

describe("runCheckout", () => {
  it("a failed checkout logs checkout_failed with a code (never the message), and offers Try again", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef?qa=1");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 })));
    const outcome = await unlock.runCheckout(top, { promo: false, retry: true });
    expect(outcome).toEqual({ kind: "failed", failure: { code: "server", message: "Couldn't start checkout. Please try again." } });
    const failed = (await captured()).find((e) => e.event === "checkout_failed")!;
    expect(failed.properties).toMatchObject({ ...top, code: "server", retry: true, viewport: "mobile", is_test: true });
    expect(JSON.stringify(failed.properties)).not.toContain("Couldn't start checkout");
    expect(unlock.checkoutRecovery("server", false)[0]).toBe("retry");
  });

  it("starts checkout for the kit and hands back where to go", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    const fetch = vi.fn(async () => Response.json({ url: "/checkout/mock?product=kit", promo: "none" }));
    vi.stubGlobal("fetch", fetch);
    expect(await unlock.runCheckout(top, { promo: false, retry: false })).toEqual({ kind: "redirect", url: "/checkout/mock?product=kit" });
    expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ product: "kit", kitId: top.kitId });
    expect(posthog.capture).not.toHaveBeenCalledWith("checkout_failed", expect.anything());
  });

  it("a promo the session didn't get is a full-price fallback, not a redirect", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ url: "/checkout/full", promo: "unavailable" })));
    expect(await unlock.runCheckout(top, { promo: true, retry: false })).toEqual({ kind: "full_price", url: "/checkout/full" });
  });

  /** A fetch that never answers, as a hung /api/checkout, but rejects like the real one when its signal aborts. */
  const hungFetch = () =>
    vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("The operation was aborted.", "AbortError")))),
    );

  it("a checkout that never answers is aborted after CHECKOUT_TIMEOUT_MS: a network failure, logged once", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    const fetch = hungFetch();
    vi.stubGlobal("fetch", fetch);
    vi.useFakeTimers();
    try {
      const outcome = unlock.runCheckout(top, { promo: false, retry: false });
      await vi.advanceTimersByTimeAsync(unlock.CHECKOUT_TIMEOUT_MS - 1);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect((fetch.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await outcome).toEqual({ kind: "failed", failure: { code: "network", message: "We couldn't reach checkout. Check your connection and try again." } });
      expect((fetch.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
    const failed = (await captured()).filter((e) => e.event === "checkout_failed");
    expect(failed).toHaveLength(1);
    expect(failed[0].properties).toMatchObject({ ...top, code: "network", retry: false });
    expect(unlock.CHECKOUT_TIMEOUT_MS).toBe(15_000);
  });

  it("an answer in time clears the timeout", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ url: "/checkout/mock?product=kit", promo: "none" })));
    vi.useFakeTimers();
    try {
      expect(await unlock.runCheckout(top, { promo: false, retry: false })).toMatchObject({ kind: "redirect" });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the caller unmounting cancels it: request aborted, timer cleared, nothing shown or logged", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    const fetch = hungFetch();
    vi.stubGlobal("fetch", fetch);
    vi.useFakeTimers();
    const unmount = new AbortController();
    try {
      const outcome = unlock.runCheckout(top, { promo: false, retry: false }, { signal: unmount.signal });
      await vi.advanceTimersByTimeAsync(1000);
      unmount.abort();
      expect(await outcome).toEqual({ kind: "cancelled" });
      expect((fetch.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(unlock.CHECKOUT_TIMEOUT_MS);
    } finally {
      vi.useRealTimers();
    }
    expect(posthog.capture).not.toHaveBeenCalledWith("checkout_failed", expect.anything());
  });

  /** runCheckout against one /api/checkout answer: the outcome, and every checkout_failed the page logged for it. */
  async function checkoutAnswering(response: () => Response, isLoggedIn = false) {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    vi.stubGlobal("fetch", vi.fn(async () => response()));
    const outcome = await unlock.runCheckout({ ...top, isLoggedIn }, { promo: false, retry: false });
    const failed = (await captured()).filter((e) => e.event === "checkout_failed");
    return { unlock, outcome, failed };
  }
  const OFFLINE = "Checkout is offline for a few minutes. Your preview is saved: try again shortly, or email hello@launchloop.dev and we'll send you a payment link.";

  it("a non-JSON 500 (plain text) never shows 'Request failed (500)': a friendly message, Try again, checkout_failed once as server", async () => {
    const { unlock, outcome, failed } = await checkoutAnswering(() => new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain" } }));
    expect(outcome).toEqual({ kind: "failed", failure: { code: "server", message: "Couldn't start checkout. Please try again." } });
    expect(JSON.stringify(outcome)).not.toMatch(/Request failed|500|Internal Server Error/);
    expect(unlock.checkoutRecovery("server", false)).toEqual(["retry", "save"]);
    expect(failed).toHaveLength(1);
    expect(failed[0].properties).toMatchObject({ code: "server", position: "top", retry: false });
  });

  it("a gateway 503 without our code (an HTML page) is checkout being unavailable: the offline message and the email-us link", async () => {
    const { unlock, outcome, failed } = await checkoutAnswering(
      () => new Response("<html><body><h1>503 Service Temporarily Unavailable</h1></body></html>", { status: 503, headers: { "Content-Type": "text/html" } }),
    );
    expect(outcome).toEqual({ kind: "failed", failure: { code: "checkout_unavailable", message: OFFLINE } });
    expect(unlock.checkoutRecovery("checkout_unavailable", false)).toEqual(["retry", "email_us", "save"]);
    expect(unlock.checkoutRecovery("checkout_unavailable", true)).toEqual(["retry", "email_us"]);
    expect(failed).toHaveLength(1);
    expect(failed[0].properties).toMatchObject({ code: "checkout_unavailable" });
  });

  it("a JSON 503 with a code other than ours is still unavailable, with the offline message (not its own wording)", async () => {
    const { outcome } = await checkoutAnswering(() => Response.json({ code: "upstream_down" }, { status: 503 }));
    expect(outcome).toEqual({ kind: "failed", failure: { code: "checkout_unavailable", message: OFFLINE } });
  });

  it("our JSON 503 (checkout_unavailable) keeps the route's own message, with the email-us link", async () => {
    const { outcome, failed } = await checkoutAnswering(() => Response.json({ error: OFFLINE, code: "checkout_unavailable" }, { status: 503 }), true);
    expect(outcome).toEqual({ kind: "failed", failure: { code: "checkout_unavailable", message: OFFLINE } });
    expect(failed).toHaveLength(1);
    expect(failed[0].properties).toMatchObject({ code: "checkout_unavailable", isLoggedIn: true });
  });

  it("a JSON error's own message is shown; a non-JSON 429 or 404 gets ours, never the raw status", async () => {
    expect((await checkoutAnswering(() => Response.json({ error: "Too many checkout attempts. Try again in a few minutes.", code: "rate_limited" }, { status: 429 }))).outcome).toEqual({
      kind: "failed",
      failure: { code: "rate_limited", message: "Too many checkout attempts. Try again in a few minutes." },
    });
    expect((await checkoutAnswering(() => new Response("Too Many Requests", { status: 429 }))).outcome).toEqual({
      kind: "failed",
      failure: { code: "rate_limited", message: "Too many checkout attempts. Try again in a few minutes." },
    });
    expect((await checkoutAnswering(() => new Response("Not Found", { status: 404 }))).outcome).toEqual({
      kind: "failed",
      failure: { code: "kit_missing", message: "That kit doesn't exist any more. Generate a new preview." },
    });
  });

  it("shownError: the API's message when it sent one, else the fallback, for the panel's login and save errors", async () => {
    const { client } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    const { ApiError, shownError } = client;
    expect(shownError(new ApiError("Too many login links requested. Try again in an hour.", 429, "rate", "Too many login links requested. Try again in an hour."), "fallback")).toBe(
      "Too many login links requested. Try again in an hour.",
    );
    expect(shownError(new ApiError("Request failed (500)", 500), "We couldn't send your login link. Please try again.")).toBe("We couldn't send your login link. Please try again.");
    expect(shownError(new TypeError("Failed to fetch"), "fallback")).toBe("fallback");
    // postJson itself: a plain-text error carries no server message, so nothing raw reaches the screen.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Bad Gateway", { status: 502 })));
    const error = await client.postJson("/api/auth/request", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, serverMessage: undefined });
  });

  it("an answer without a URL is a failure, not a navigation to /undefined", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    expect(await unlock.runCheckout(top, { promo: false, retry: false })).toMatchObject({ kind: "failed", failure: { code: "server" } });
  });
});

describe("checkout errors always carry a CTA", () => {
  it("classifies what /api/checkout and the network can throw, with a message worth showing", async () => {
    const { unlock, client } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    const { ApiError } = client;
    expect(unlock.checkoutFailure(new TypeError("Failed to fetch"))).toEqual({ code: "network", message: "We couldn't reach checkout. Check your connection and try again." });
    expect(unlock.checkoutFailure(new ApiError("Too many checkout attempts. Try again in a few minutes.", 429, "rate_limited")).code).toBe("rate_limited");
    expect(unlock.checkoutFailure(new ApiError("That kit doesn't exist any more. Generate a new preview.", 404))).toEqual({
      code: "kit_missing",
      message: "That kit doesn't exist any more. Generate a new preview.",
    });
    expect(unlock.checkoutFailure(new ApiError("Couldn't start checkout. Please try again.", 502)).code).toBe("server");
    // /api/checkout's 503 when production has no Stripe (#92): its own code, and its message (which says what to do) as is.
    const offline = "Checkout is offline for a few minutes. Your preview is saved: try again shortly, or email hello@launchloop.dev and we'll send you a payment link.";
    expect(unlock.checkoutFailure(new ApiError(offline, 503, "checkout_unavailable"))).toEqual({ code: "checkout_unavailable", message: offline });
    expect(unlock.checkoutFailure(new ApiError("Unknown product", 400, "invalid_product")).code).toBe("unknown");
    // A raw script error is never shown as is.
    expect(unlock.checkoutFailure(new Error("Cannot read properties of undefined (reading 'url')"))).toEqual({ code: "unknown", message: "Couldn't start checkout. Please try again." });
  });

  it("every failure offers at least one action: Try again unless the kit is gone, the save link only when signed out", async () => {
    const { unlock } = await landOn("https://launchloop.dev/kit/kit_0123456789abcdef");
    const codes = ["network", "rate_limited", "kit_missing", "checkout_unavailable", "server", "unknown"] as const;
    for (const code of codes) {
      for (const isLoggedIn of [true, false]) {
        const actions = unlock.checkoutRecovery(code, isLoggedIn);
        expect(actions.length).toBeGreaterThan(0);
        expect(actions.includes("retry")).toBe(code !== "kit_missing");
        expect(actions.includes("save")).toBe(code !== "kit_missing" && !isLoggedIn);
        expect(actions.includes("email_us")).toBe(code === "checkout_unavailable");
      }
    }
    expect(unlock.checkoutRecovery("kit_missing", false)).toEqual(["new_preview"]);
    expect(unlock.checkoutRecovery("checkout_unavailable", true)).toEqual(["retry", "email_us"]);
  });
});
