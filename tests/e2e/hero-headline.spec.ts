import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { HERO_HEADLINE_CONTROL, HERO_HEADLINE_TEST } from "../../src/lib/hero-headline";
import { h1Tags, logIn, makeSampleKit, setHeroHeadline, uniqueEmail } from "./helpers";

// Runs against the HERO_EXPERIMENT=1 build (projects hero-desktop and hero-mobile), whose flag lookup gets 2.5 s.

const FIXTURE = "http://127.0.0.1:3419";
// posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver).
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

interface PhEvent {
  event: string;
  distinct_id?: string;
  properties: Record<string, unknown>;
}
const distinctId = (e: PhEvent) => e.distinct_id ?? (e.properties.distinct_id as string | undefined);
const phEvents = async (request: APIRequestContext) => (await (await request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];
const heroEvents = async (request: APIRequestContext, id: string) =>
  (await phEvents(request)).filter((e) => distinctId(e) === id && (e.properties.$feature_flag === "exp_hero_headline" || e.properties.flag === "exp_hero_headline"));

const headline = (page: Page) => page.getByRole("main").getByRole("heading", { level: 1 });
const SUBHEADLINE = "LaunchLoop reads your repo's README, package.json and recent commits, plus your live site";

interface Watch {
  __seenHeadlines: string[];
  __firstVisibleAt?: number;
  __loadAt?: number;
  __shift: number;
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
    const w = window as unknown as Watch;
    // Every home h1 text painted visible, frame by frame; when one first showed; total layout shift; the load event.
    w.__seenHeadlines = [];
    w.__shift = 0;
    addEventListener("load", () => (w.__loadAt = performance.now()), { once: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__shift += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    const tick = () => {
      // The h1, or the placeholder standing in for it until React reveals the streamed h1.
      for (const h1 of location.pathname === "/" ? document.querySelectorAll('main #start :is(h1, [role="heading"])') : []) {
        if (getComputedStyle(h1).visibility !== "visible") continue;
        w.__firstVisibleAt ??= performance.now();
        const text = h1.textContent ?? "";
        if (!w.__seenHeadlines.includes(text)) w.__seenHeadlines.push(text);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
});
test.afterEach(({ request }) => setHeroHeadline(request, null));

const watched = (page: Page) =>
  page.evaluate((): Watch => {
    const w = window as unknown as Watch;
    return { __seenHeadlines: w.__seenHeadlines, __firstVisibleAt: w.__firstVisibleAt, __loadAt: w.__loadAt, __shift: w.__shift };
  });

/** This page's anonymous id, from its own $pageview (sent once the SDK has loaded after the page). */
async function pageId(page: Page, before: number): Promise<string> {
  let id: string | undefined;
  await expect
    .poll(async () => {
      const view = (await phEvents(page.request)).slice(before).find((e) => e.event === "$pageview" && e.properties.$pathname === "/");
      id = view && distinctId(view);
      return id;
    })
    .toBeTruthy();
  return id!;
}

test.describe("recording", () => {
  test.use({ userAgent });
  test.skip(({ isMobile }) => isMobile, "Recording doesn't depend on the viewport");

  test("no flag: the current headline, never anything else, and nothing recorded", async ({ page }) => {
    const before = (await phEvents(page.request)).length;
    await page.goto("/");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_CONTROL);
    const id = await pageId(page, before);
    await page.waitForTimeout(1000);
    expect(await heroEvents(page.request, id)).toEqual([]);
    expect((await watched(page)).__seenHeadlines).toEqual([HERO_HEADLINE_CONTROL]);
  });

  test("forced test: only the h1 changes, with no swap, and the exposure joins preview_started on the page's id", async ({ page }) => {
    await setHeroHeadline(page.request, "test");
    const before = (await phEvents(page.request)).length;
    await page.goto("/");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_TEST);
    await expect(page.getByRole("main").getByText(SUBHEADLINE)).toBeVisible();
    await expect(page.getByRole("button", { name: "Try a sample app" })).toBeVisible();
    const id = await pageId(page, before);
    await expect.poll(async () => (await heroEvents(page.request, id)).map((e) => e.event)).toEqual(["$feature_flag_called"]);
    expect((await heroEvents(page.request, id))[0].properties).toMatchObject({ $feature_flag_response: "test", "$feature/exp_hero_headline": "test" });
    expect((await heroEvents(page.request, id))[0].properties).not.toHaveProperty("is_test");
    // The exposure waited for the SDK to load after the page, as before: it didn't pull posthog-js in early.
    const timing = await page.evaluate(() => ({
      loadAt: (window as unknown as Watch).__loadAt!,
      flagsAt: performance.getEntriesByType("resource").find((e) => e.name.includes("/lp-relay/flags"))?.startTime,
    }));
    expect(timing.flagsAt).toBeGreaterThan(timing.loadAt);
    expect((await watched(page)).__seenHeadlines).toEqual([HERO_HEADLINE_TEST]);

    await page.getByRole("button", { name: "Try a sample app" }).click();
    await page.waitForURL(/\/kit\/[\w-]+$/);
    await expect.poll(async () => (await phEvents(page.request)).some((e) => e.event === "preview_started" && distinctId(e) === id)).toBe(true);
  });

  test("forced control: the current headline, with a control exposure", async ({ page }) => {
    await setHeroHeadline(page.request, "control");
    const before = (await phEvents(page.request)).length;
    await page.goto("/");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_CONTROL);
    const id = await pageId(page, before);
    await expect.poll(async () => (await heroEvents(page.request, id)).map((e) => [e.event, e.properties.$feature_flag_response])).toEqual([["$feature_flag_called", "control"]]);
  });

  test("PostHog past the lookup's deadline: aborted, control, logged as a timeout fallback", async ({ page }) => {
    await setHeroHeadline(page.request, "test", 4000);
    const before = (await phEvents(page.request)).length;
    await page.goto("/");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_CONTROL);
    const id = await pageId(page, before);
    await expect.poll(async () => (await heroEvents(page.request, id)).map((e) => [e.event, e.properties.reason])).toEqual([["flag_fallback", "timeout"]]);
    expect((await watched(page)).__seenHeadlines).toEqual([HERO_HEADLINE_CONTROL]);
  });

  test("a flag that gives this view no variant: control, logged as an unassigned fallback", async ({ page }) => {
    await setHeroHeadline(page.request, false);
    const before = (await phEvents(page.request)).length;
    await page.goto("/");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_CONTROL);
    const id = await pageId(page, before);
    await expect.poll(async () => (await heroEvents(page.request, id)).map((e) => [e.event, e.properties.reason])).toEqual([["flag_fallback", "unassigned"]]);
  });

  test("QA visits (?qa=1 or utm_source=qa): the hero exposure and its fallback carry is_test", async ({ page }) => {
    await setHeroHeadline(page.request, "test");
    let before = (await phEvents(page.request)).length;
    await page.goto("/?qa=1");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_TEST);
    let id = await pageId(page, before);
    await expect.poll(async () => (await heroEvents(page.request, id)).map((e) => [e.event, e.properties.is_test])).toEqual([["$feature_flag_called", true]]);

    // A fresh QA landing, not the tab remembering the last one.
    await page.evaluate(() => sessionStorage.clear());
    await setHeroHeadline(page.request, false);
    before = (await phEvents(page.request)).length;
    await page.goto("/?utm_source=qa");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_CONTROL);
    id = await pageId(page, before);
    await expect.poll(async () => (await heroEvents(page.request, id)).map((e) => [e.event, e.properties.reason, e.properties.is_test])).toEqual([["flag_fallback", "unassigned", true]]);
  });

  test("coming back to the home page client-side keeps the headline this page load showed", async ({ page }) => {
    await setHeroHeadline(page.request, "test");
    await page.goto("/");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_TEST);
    await page.waitForLoadState("networkidle");
    // The next server render would be control, but this page load already showed test.
    await setHeroHeadline(page.request, "control");
    await page.evaluate(() => ((window as unknown as { __samePage: boolean }).__samePage = true));
    await page.getByRole("banner").getByRole("link", { name: "Pricing" }).click();
    await page.waitForURL((u) => u.pathname === "/pricing");
    await page.getByRole("banner").getByRole("link", { name: "LaunchLoop" }).first().click();
    await page.waitForURL((u) => u.pathname === "/");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_TEST);
    expect(await page.evaluate(() => (window as unknown as { __samePage?: boolean }).__samePage)).toBe(true);
    expect((await watched(page)).__seenHeadlines).toEqual([HERO_HEADLINE_TEST]);
  });

  test("doesn't touch the other experiments: the kit paywall and checkout are as before", async ({ page }) => {
    await setHeroHeadline(page.request, "test");
    await logIn(page, uniqueEmail("hero-isolation"));
    await makeSampleKit(page);
    await expect(page.getByTestId("kit-price")).toContainText("£19");
    await expect(page.getByTestId("launch-promo")).toHaveCount(0);
    const checkout = page.waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/checkout");
    await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
    expect((await checkout).postDataJSON()).toMatchObject({ product: "kit", experiments: {}, fallbacks: [] });
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    expect(new URL(page.url()).searchParams.get("promo")).toBeNull();
  });
});

test.describe("failsafe", () => {
  test.use({ userAgent });
  test.skip(({ isMobile }) => isMobile, "The failsafe doesn't depend on the viewport");

  test("a headline that hasn't streamed in by 700 ms shows control, and control stays when test arrives later", async ({ page }) => {
    // Inside the lookup's 2.5 s here, so the render really does stall well past the failsafe, then streams test.
    await setHeroHeadline(page.request, "test", 1800);
    const before = (await phEvents(page.request)).length;
    const started = Date.now();
    await page.goto("/", { waitUntil: "commit" });
    await expect(headline(page)).toBeVisible({ timeout: 1500 });
    await expect(headline(page)).toHaveText(HERO_HEADLINE_CONTROL);
    const shownAfter = Date.now() - started;
    expect(shownAfter).toBeLessThan(1700);
    // Wait out the late answer and React's reveal: still control, never test.
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    await expect(headline(page)).toHaveText(HERO_HEADLINE_CONTROL);
    const watch = await watched(page);
    expect(watch.__seenHeadlines).toEqual([HERO_HEADLINE_CONTROL]);
    expect(watch.__shift).toBe(0);
    // The view is out of the experiment: a timeout fallback, not a test exposure.
    const id = await pageId(page, before);
    await expect.poll(async () => (await heroEvents(page.request, id)).map((e) => [e.event, e.properties.reason])).toEqual([["flag_fallback", "timeout"]]);
  });
});

test.describe("layout", () => {
  /** Where the form, its CTA and the subheadline sit, once the headline is final. */
  async function positions(page: Page, variant: "control" | "test", expected: string) {
    await setHeroHeadline(page.request, variant, 300);
    await page.goto("/");
    await expect(headline(page)).toHaveText(expected);
    await page.waitForLoadState("load");
    const box = async (locator: ReturnType<Page["locator"]>) => (await locator.boundingBox())!;
    const main = page.getByRole("main");
    const [h1, sub, form, cta] = await Promise.all([
      box(headline(page)),
      box(main.getByText(SUBHEADLINE)),
      box(main.getByRole("form", { name: "Generate a launch kit" })),
      box(main.getByRole("button", { name: "Get my free preview" }).first()),
    ]);
    return { h1: { y: h1.y, height: h1.height }, sub: sub.y, form: form.y, cta: { x: cta.x, y: cta.y }, shift: (await watched(page)).__shift };
  }

  test("zero layout shift, and the form and CTA sit in the same place in both arms", async ({ page, isMobile }) => {
    for (const width of isMobile ? [360, 412] : [1280, 700]) {
      await page.setViewportSize({ width, height: 900 });
      const control = await positions(page, "control", HERO_HEADLINE_CONTROL);
      const variant = await positions(page, "test", HERO_HEADLINE_TEST);
      expect(control.shift, `layout shift, control, ${width}px`).toBe(0);
      expect(variant.shift, `layout shift, test, ${width}px`).toBe(0);
      expect(variant, `positions at ${width}px`).toEqual(control);
    }
  });

  test("the test headline fits phones and leaves the rest of the hero alone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phones only");
    await setHeroHeadline(page.request, "test");
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await expect(headline(page)).toHaveText(HERO_HEADLINE_TEST);
      await expect(page.getByLabel("GitHub repo or live site URL")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `document wider than a ${width}px viewport`).toBeLessThanOrEqual(0);
    }
  });
});

test("the server HTML has exactly one h1, the streamed headline, whatever the flag says", async ({ request, isMobile }) => {
  test.skip(isMobile, "The HTML doesn't depend on the viewport");
  for (const variant of [null, false, "control", "test"] as const) {
    await setHeroHeadline(request, variant);
    const html = await (await request.get("/")).text();
    expect(html, `flag ${variant}`).toContain("data-hero-pending");
    expect(h1Tags(html), `flag ${variant}`).toHaveLength(1);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the headline still shows: control, since the streamed variant needs JavaScript to swap in", async ({ page }) => {
    await setHeroHeadline(page.request, "test");
    await page.goto("/");
    await expect(headline(page)).toHaveText(HERO_HEADLINE_CONTROL);
    await expect(headline(page)).toBeVisible();
  });
});
