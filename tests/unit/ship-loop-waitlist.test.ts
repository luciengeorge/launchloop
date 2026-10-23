import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ShipLoopUpsell } from "@/components/kit/ship-loop-upsell";
import { EXPERIMENTS } from "@/lib/experiments";

const posthog = vi.hoisted(() => ({ __loaded: false, init: vi.fn(), register: vi.fn(), capture: vi.fn(), get_distinct_id: () => "ph_page" }));
vi.mock("posthog-js", () => ({ default: posthog }));

const TEST_VISIT_KEY = "launchloop:is_test";
const EMAIL = "buyer@example.com";
const KIT = { source: "kit_upsell", kitId: "kit_123" } as const;

/**
 * A fresh page load of `url` (the kit success page by default), as instrumentation-client starts it. `loaded`: the
 * window load event has passed, so the SDK has loaded (false: before that).
 */
async function landOn(url = `https://launchloop.dev/account/kits/${KIT.kitId}?paid=1&aid=ph_1`, storage: Record<string, string> = {}, { loaded = true } = {}) {
  vi.resetModules();
  posthog.capture.mockClear();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_unit");
  vi.stubGlobal("window", { location: new URL(url) });
  vi.stubGlobal("document", { referrer: "" });
  vi.stubGlobal("navigator", { webdriver: false });
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => storage[key] ?? null, setItem: (key: string, value: string) => void (storage[key] = value) });
  const analytics = await import("@/lib/analytics");
  analytics.rememberFirstTouch();
  if (loaded) await analytics.loadAnalytics();
  posthog.init.mockClear();
  return { analytics, ...(await import("@/lib/waitlist-client")) };
}

/** Lets track()'s SDK load and capture run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const captured = (event?: string) => posthog.capture.mock.calls.filter(([name]) => event === undefined || name === event).map(([name, props]) => ({ name, props }));

function respond(status: number, body: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

/** Just enough IntersectionObserver to drive by hand: `show(visible)` calls every connected observer. */
function fakeIntersectionObserver() {
  const observers = new Set<{ callback: IntersectionObserverCallback; connected: boolean }>();
  class FakeObserver {
    private entry: { callback: IntersectionObserverCallback; connected: boolean };
    constructor(callback: IntersectionObserverCallback) {
      this.entry = { callback, connected: false };
      observers.add(this.entry);
    }
    observe() {
      this.entry.connected = true;
    }
    disconnect() {
      this.entry.connected = false;
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return {
    show(isIntersecting = true) {
      for (const o of [...observers]) if (o.connected) o.callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
    },
    get connected() {
      return [...observers].filter((o) => o.connected).length;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Ship Loop waitlist ask on the kit success page", () => {
  it("renders for every buyer without any flag: the free waitlist only, no price, no payment", () => {
    expect(Object.values(EXPERIMENTS).some((key) => key.includes("shiploop"))).toBe(false);
    const html = renderToStaticMarkup(createElement(ShipLoopUpsell, { kitId: KIT.kitId }));
    expect(html).toContain('data-testid="ship-loop-upsell"');
    expect(html).toContain("You&#x27;re in. Your kit is on its way to your inbox.");
    expect(html).toContain("Join the waitlist, we&#x27;ll email you when it launches. It&#x27;s free.");
    expect(html).toContain('<input type="hidden" name="source" value="kit_upsell"/>');
    expect(html).toMatch(/<label for="[^"]+" class="sr-only">Email<\/label>/);
    expect(html).toContain(">Join the waitlist</button>");
    expect(html).not.toMatch(/£|\$\d|€|price|pre-?order|checkout|stripe|name="plan"/i);
    expect(html).not.toContain("\u2014");
    // Rendering asks PostHog nothing: no flag lookup decides whether it shows.
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("the email field and the submit button are 44px tall (h-11)", () => {
    const html = renderToStaticMarkup(createElement(ShipLoopUpsell, { kitId: KIT.kitId }));
    const tag = (pattern: RegExp) => html.match(pattern)?.[0] ?? "";
    expect(tag(/<input[^>]*name="email"[^>]*>/)).toMatch(/class="[^"]*\bh-11\b/);
    expect(tag(/<button[^>]*type="submit"[^>]*>/)).toMatch(/class="[^"]*\bh-11\b/);
  });
});

describe("waitlist_cta_viewed", () => {
  it("doesn't load the SDK early: a view before the page has loaded waits for the SDK's normal load, then goes", async () => {
    const { analytics, waitlistViewTracker } = await landOn(undefined, {}, { loaded: false });
    const io = fakeIntersectionObserver();
    waitlistViewTracker(KIT).observe({} as Element);
    io.show(true);
    await settle();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(captured()).toEqual([]);
    await analytics.loadAnalytics();
    await settle();
    expect(captured()).toEqual([{ name: "waitlist_cta_viewed", props: { signup_source: "kit_upsell", kitId: KIT.kitId } }]);
  });

  it("fires once, when the ask is on screen, however often it's seen or the effect re-runs (StrictMode)", async () => {
    const { waitlistViewTracker } = await landOn();
    const io = fakeIntersectionObserver();
    const tracker = waitlistViewTracker(KIT);
    const el = {} as Element;

    // StrictMode: mount, unmount, mount again before anything is visible.
    tracker.observe(el)();
    const cleanup = tracker.observe(el);
    expect(io.connected).toBe(1);
    io.show(false);
    await settle();
    expect(captured("waitlist_cta_viewed")).toHaveLength(0);

    io.show(true);
    io.show(true);
    await settle();
    expect(captured("waitlist_cta_viewed")).toEqual([{ name: "waitlist_cta_viewed", props: { signup_source: "kit_upsell", kitId: KIT.kitId } }]);
    expect(io.connected).toBe(0);

    // A later effect run (StrictMode, a re-render) doesn't observe again.
    cleanup();
    tracker.observe(el);
    io.show(true);
    await settle();
    expect(captured("waitlist_cta_viewed")).toHaveLength(1);
  });
});

describe("waitlist_signup and waitlist_error", () => {
  it("waitlist_signup fires only once /api/waitlist has answered 2xx, never before", async () => {
    const { joinWaitlist } = await landOn();
    let answer!: (res: Response) => void;
    const pending = new Promise<Response>((resolve) => (answer = resolve));
    const fetcher = vi.fn(() => pending);
    const joining = joinWaitlist(EMAIL, KIT, fetcher);
    await settle();
    expect(fetcher).toHaveBeenCalledWith("/api/waitlist", expect.objectContaining({ method: "POST", body: JSON.stringify({ email: EMAIL, source: "kit_upsell" }) }));
    expect(captured()).toEqual([]);

    answer(new Response(JSON.stringify({ ok: true, duplicate: false }), { status: 200 }));
    expect(await joining).toEqual({ ok: true, duplicate: false });
    await settle();
    expect(captured()).toEqual([{ name: "waitlist_signup", props: { signup_source: "kit_upsell", kitId: KIT.kitId, duplicate: false } }]);
  });

  it("a repeat signup (2xx, duplicate) is still a waitlist_signup, flagged duplicate", async () => {
    const { joinWaitlist } = await landOn();
    expect(await joinWaitlist(EMAIL, KIT, respond(200, { ok: true, duplicate: true }))).toEqual({ ok: true, duplicate: true });
    await settle();
    expect(captured()).toEqual([{ name: "waitlist_signup", props: { signup_source: "kit_upsell", kitId: KIT.kitId, duplicate: true } }]);
  });

  it("a 400 (validation) sends waitlist_error with the status and a reason, no signup, and no email", async () => {
    const { joinWaitlist } = await landOn();
    const result = await joinWaitlist(EMAIL, KIT, respond(400, { error: "Enter a valid email address." }));
    expect(result).toEqual({ ok: false, status: 400, reason: "invalid_email", message: "Enter a valid email address." });
    await settle();
    expect(captured()).toEqual([{ name: "waitlist_error", props: { signup_source: "kit_upsell", kitId: KIT.kitId, status: 400, reason: "invalid_email" } }]);
    expect(JSON.stringify(posthog.capture.mock.calls)).not.toContain(EMAIL);
  });

  it("a network failure sends waitlist_error with status 0 and reason network, and a message to show", async () => {
    const { joinWaitlist } = await landOn();
    const result = await joinWaitlist(EMAIL, KIT, vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    expect(result).toMatchObject({ ok: false, status: 0, reason: "network" });
    expect(result.ok ? "" : result.message).toBe("We couldn't reach LaunchLoop. Check your connection and try again.");
    await settle();
    expect(captured()).toEqual([{ name: "waitlist_error", props: { signup_source: "kit_upsell", kitId: KIT.kitId, status: 0, reason: "network" } }]);
    expect(captured("waitlist_signup")).toHaveLength(0);
  });

  it("5xx, 429 and any other non-2xx are errors too; a body without a message gets ours", async () => {
    const { joinWaitlist } = await landOn();
    expect(await joinWaitlist(EMAIL, KIT, respond(500, {}))).toMatchObject({ ok: false, status: 500, reason: "server_error", message: "Couldn't add you right now. Please try again." });
    expect(await joinWaitlist(EMAIL, KIT, respond(429, { error: "Too many attempts. Try again later." }))).toMatchObject({ reason: "rate_limited", message: "Too many attempts. Try again later." });
    expect(await joinWaitlist(EMAIL, KIT, respond(404, {}))).toMatchObject({ reason: "http_error" });
    await settle();
    expect(captured().map(({ name, props }) => [name, props.status, props.reason])).toEqual([
      ["waitlist_error", 500, "server_error"],
      ["waitlist_error", 429, "rate_limited"],
      ["waitlist_error", 404, "http_error"],
    ]);
  });
});

describe("is_test on waitlist events", () => {
  it("is never set for a real buyer", async () => {
    const { joinWaitlist, waitlistViewTracker } = await landOn();
    vi.stubGlobal("IntersectionObserver", undefined);
    waitlistViewTracker(KIT).observe({} as Element);
    await joinWaitlist(EMAIL, KIT, respond(200, { ok: true, duplicate: false }));
    await joinWaitlist(EMAIL, KIT, respond(400, {}));
    await settle();
    expect(captured().map(({ name }) => name)).toEqual(["waitlist_cta_viewed", "waitlist_signup", "waitlist_error"]);
    for (const { props } of captured()) {
      expect(props).not.toHaveProperty("is_test");
      expect(props.is_test === true).toBe(false);
    }
  });

  it("is true on a ?qa=1 page, and on the trip back from checkout in a tab that landed with ?qa=1", async () => {
    for (const load of [() => landOn(`https://launchloop.dev/account/kits/${KIT.kitId}?paid=1&qa=1`), () => landOn(undefined, { [TEST_VISIT_KEY]: "1" })]) {
      const { joinWaitlist, waitlistViewTracker } = await load();
      vi.stubGlobal("IntersectionObserver", undefined);
      waitlistViewTracker(KIT).observe({} as Element);
      await joinWaitlist(EMAIL, KIT, respond(200, { ok: true, duplicate: false }));
      await joinWaitlist(EMAIL, KIT, vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
      await settle();
      expect(captured().map(({ name, props }) => [name, props.is_test])).toEqual([
        ["waitlist_cta_viewed", true],
        ["waitlist_signup", true],
        ["waitlist_error", true],
      ]);
    }
  });

  it("utm_source=qa counts as QA too", async () => {
    const { joinWaitlist } = await landOn(`https://launchloop.dev/account/kits/${KIT.kitId}?paid=1&utm_source=qa`);
    await joinWaitlist(EMAIL, KIT, respond(200, { ok: true, duplicate: false }));
    await settle();
    expect(captured("waitlist_signup")[0]!.props).toMatchObject({ is_test: true });
  });
});
