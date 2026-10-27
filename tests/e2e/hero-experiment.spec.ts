import { expect, test, type Page } from "@playwright/test";
import { EXAMPLE_KIT } from "@/lib/example-kit";
import { EXAMPLE_KIT_PATH } from "@/lib/site";
import { contrast } from "./helpers";

const FIXTURE = "http://127.0.0.1:3419";
const FLAG = "exp_hero_sample_cta";

interface PhEvent {
  event: string;
  properties: Record<string, unknown>;
}

test.use({
  // posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver).
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}` },
});
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });
});
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "ignoreErrors" }));

/** Answers PostHog's flags request in the browser with this hero variant, optionally late. */
async function forceHeroVariant(page: Page, variant: "control" | "test", delayMs = 0) {
  await page.route(/\/lp-relay\/flags/, async (route) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ json: { flags: { [FLAG]: { key: FLAG, enabled: true, variant, reason: null, metadata: {} } }, errorsWhileComputingFlags: false } }).catch(() => undefined);
  });
}

/** The home page, tagged so this test's events can be told apart (only utm_ params survive URL scrubbing). */
async function openHome(page: Page) {
  const campaign = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await page.goto(`/?utm_campaign=${campaign}`);
  return campaign;
}

async function eventsFor(page: Page, campaign: string): Promise<PhEvent[]> {
  const all = (await (await page.request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];
  return all.filter((e) => e.properties.utm_campaign === campaign);
}

async function waitForEvent(page: Page, campaign: string, match: (e: PhEvent) => boolean): Promise<PhEvent> {
  let found: PhEvent | undefined;
  await expect
    .poll(async () => {
      found = (await eventsFor(page, campaign)).find(match);
      return found;
    })
    .toBeTruthy();
  return found!;
}

const exposure = (e: PhEvent) => e.event === "$feature_flag_called" && e.properties.$feature_flag === FLAG;
const fallback = (e: PhEvent) => e.event === "flag_fallback" && e.properties.flag === FLAG;
const sampleCta = (page: Page) => page.getByRole("button", { name: "Try a sample app" });
const exampleLink = (page: Page) => page.locator("#start").getByRole("link", { name: "See an example kit" });
const height = async (page: Page, testId: string) => (await page.getByTestId(testId).boundingBox())!.height;

async function startSample(page: Page, campaign: string): Promise<PhEvent> {
  await sampleCta(page).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  return waitForEvent(page, campaign, (e) => e.event === "preview_started");
}

test("test: the sample app is a 44px button and the hero links to the example kit; the exposure and preview_started say test", async ({ page }) => {
  await forceHeroVariant(page, "test");
  const campaign = await openHome(page);

  await expect(sampleCta(page)).toHaveAttribute("data-variant", "test");
  expect((await sampleCta(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(exampleLink(page)).toBeVisible();
  await expect(exampleLink(page)).toHaveAttribute("href", EXAMPLE_KIT_PATH);
  expect((await exampleLink(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);

  expect((await waitForEvent(page, campaign, exposure)).properties).toMatchObject({ $feature_flag_response: "test", [`$feature/${FLAG}`]: "test" });
  const started = await startSample(page, campaign);
  expect(started.properties).toMatchObject({ source: "sample", [`$feature/${FLAG}`]: "test" });
  expect(started.properties).not.toHaveProperty(`fallback/${FLAG}`);
  // The kit page the visitor lands on (a client navigation) is still split by what the hero showed.
  expect((await waitForEvent(page, campaign, (e) => e.event === "preview_completed")).properties[`$feature/${FLAG}`]).toBe("test");
});

test("control assignment: the quiet sample link, an empty example line; the exposure and preview_started say control", async ({ page }) => {
  await forceHeroVariant(page, "control");
  const campaign = await openHome(page);

  expect((await waitForEvent(page, campaign, exposure)).properties).toMatchObject({ $feature_flag_response: "control" });
  await expect(sampleCta(page)).toHaveAttribute("data-variant", "control");
  expect((await sampleCta(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByTestId("example-kit-link")).toHaveCount(0);
  expect(await height(page, "example-kit-slot")).toBeGreaterThanOrEqual(44);
  expect((await startSample(page, campaign)).properties).toMatchObject({ [`$feature/${FLAG}`]: "control" });
});

test("flag missing: control, logged as flag_fallback (not an exposure), and preview_started is kept out of the experiment", async ({ page }) => {
  // The fake PostHog serves no flags, as if exp_hero_sample_cta didn't exist yet.
  const campaign = await openHome(page);

  expect((await waitForEvent(page, campaign, fallback)).properties).toMatchObject({ variant: "control", reason: "unassigned", fallback: true });
  await expect(sampleCta(page)).toHaveAttribute("data-variant", "control");
  await expect(page.getByTestId("example-kit-link")).toHaveCount(0);
  const started = await startSample(page, campaign);
  expect(started.properties).toMatchObject({ [`fallback/${FLAG}`]: "control" });
  expect(started.properties).not.toHaveProperty(`$feature/${FLAG}`);
  expect((await eventsFor(page, campaign)).filter(exposure)).toEqual([]);
});

test("flags too slow or failing: control, and the hero never flips when test arrives late", async ({ page }) => {
  // After our 1.5s timeout, inside posthog-js's own 3s flags timeout, so posthog-js does load the variant late.
  await forceHeroVariant(page, "test", 2500);
  const campaign = await openHome(page);
  expect((await waitForEvent(page, campaign, fallback)).properties).toMatchObject({ variant: "control", reason: "timeout" });
  await page.waitForTimeout(3000);
  await expect(sampleCta(page)).toHaveAttribute("data-variant", "control");
  await expect(page.getByTestId("example-kit-link")).toHaveCount(0);
  expect((await startSample(page, campaign)).properties).toMatchObject({ [`fallback/${FLAG}`]: "control" });

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.route(/\/lp-relay\/flags/, (route) => route.abort());
  const blocked = await openHome(page);
  expect((await waitForEvent(page, blocked, fallback)).properties).toMatchObject({ variant: "control" });
  await expect(sampleCta(page)).toHaveAttribute("data-variant", "control");
  await expect(page.getByTestId("example-kit-link")).toHaveCount(0);
});

test.describe("used before the flag resolves", () => {
  test("a click on Try a sample app freezes control: flag_fallback 'interacted', no test exposure, and nothing changes mid-request", async ({ page }) => {
    // Test arrives 1s after the SDK asks: before our timeout, after the click.
    await forceHeroVariant(page, "test", 1000);
    // Keep the visitor on the page while the preview runs, so a late variant would have time to show.
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/kits", async (route) => {
      await released;
      await route.continue().catch(() => undefined);
    });
    const campaign = await openHome(page);
    await expect(sampleCta(page)).toHaveAttribute("data-variant", "control");
    await sampleCta(page).click();
    await expect(page.getByTestId("kit-progress")).toBeVisible();

    expect((await waitForEvent(page, campaign, fallback)).properties).toMatchObject({ variant: "control", reason: "interacted", fallback: true });
    // The flags (test) land while the preview is still running: the hero stays as it was.
    await page.waitForTimeout(2000);
    await expect(page.getByTestId("kit-progress")).toBeVisible();
    await expect(page.getByTestId("example-kit-slot")).toHaveCount(1);
    await expect(page.getByTestId("example-kit-link")).toHaveCount(0);

    release();
    await page.waitForURL(/\/kit\/[\w-]+$/);
    const events = await eventsFor(page, campaign);
    expect(events.filter(exposure)).toEqual([]);
    for (const name of ["hero_clicked", "preview_started"]) {
      const event = events.find((e) => e.event === name)!;
      expect(event.properties, name).toMatchObject({ [`fallback/${FLAG}`]: "control" });
      expect(event.properties, name).not.toHaveProperty(`$feature/${FLAG}`);
    }
  });

  test("typing in the URL field freezes control too, and the field's text is never sent", async ({ page }) => {
    await forceHeroVariant(page, "test", 1000);
    const campaign = await openHome(page);
    const typed = `early-typist-${Date.now()}`;
    await page.getByLabel("GitHub repo or live site URL").focus();
    await page.keyboard.type(typed);

    expect((await waitForEvent(page, campaign, fallback)).properties).toMatchObject({ variant: "control", reason: "interacted" });
    await page.waitForTimeout(2500);
    await expect(sampleCta(page)).toHaveAttribute("data-variant", "control");
    await expect(page.getByTestId("example-kit-link")).toHaveCount(0);
    expect((await eventsFor(page, campaign)).filter(exposure)).toEqual([]);
    expect(JSON.stringify(await eventsFor(page, campaign))).not.toContain(typed);
  });

  test("typing before the page has hydrated (nothing listening yet) freezes control as well", async ({ page }) => {
    await forceHeroVariant(page, "test");
    // Hold the page's scripts so the visitor types into the server-rendered field before React takes over.
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await page.route(/\/_next\/static\/.*\.js$/, async (route) => {
      await released;
      await route.continue().catch(() => undefined);
    });
    const campaign = `hero-prehydration-${Date.now()}`;
    await page.goto(`/?utm_campaign=${campaign}`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("GitHub repo or live site URL").click();
    await page.keyboard.type("github.com/early/bird");
    release();

    expect((await waitForEvent(page, campaign, fallback)).properties).toMatchObject({ variant: "control", reason: "interacted" });
    await page.waitForTimeout(1500);
    await expect(sampleCta(page)).toHaveAttribute("data-variant", "control");
    await expect(page.getByTestId("example-kit-link")).toHaveCount(0);
    expect((await eventsFor(page, campaign)).filter(exposure)).toEqual([]);
  });
});

test.describe("layout", () => {
  for (const [device, viewport] of [
    ["desktop", { width: 1280, height: 900 }],
    ["375px phone", { width: 375, height: 812 }],
  ] as const) {
    test(`${device}: the variant appearing shifts nothing, and control and test take the same space`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const below = page.locator("#start").getByText("Free preview, no account needed.");
      const layout = async () => ({ below: (await below.boundingBox())!.y, hero: (await page.locator("#start").boundingBox())!.height });

      await forceHeroVariant(page, "control");
      await openHome(page);
      await expect(sampleCta(page)).toHaveAttribute("data-variant", "control");
      const control = await layout();

      await page.unrouteAll({ behavior: "ignoreErrors" });
      // Late enough that the page has painted control first.
      await forceHeroVariant(page, "test", 800);
      await openHome(page);
      await page.evaluate(() => {
        const w = window as unknown as { shifts: number };
        w.shifts = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!entry.hadRecentInput) w.shifts += entry.value;
        }).observe({ type: "layout-shift" });
      });
      const before = await layout();
      await expect(sampleCta(page)).toHaveAttribute("data-variant", "test");
      await expect(exampleLink(page)).toBeVisible();
      await page.waitForTimeout(300);
      expect(await layout()).toEqual(before);
      expect(before).toEqual(control);
      expect(await page.evaluate(() => (window as unknown as { shifts: number }).shifts)).toBe(0);
    });
  }

  test("375px phone: the sample button and the example link are both centred and at least 44px tall", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await forceHeroVariant(page, "test");
    await openHome(page);
    await expect(exampleLink(page)).toBeVisible();
    const centre = async (box: { x: number; width: number; height: number } | null) => {
      expect(box!.height).toBeGreaterThanOrEqual(44);
      return box!.x + box!.width / 2;
    };
    const button = await centre(await sampleCta(page).boundingBox());
    const link = await centre(await exampleLink(page).boundingBox());
    const form = await centre({ ...(await page.getByRole("form", { name: "Generate a launch kit" }).boundingBox())!, height: 44 });
    expect(Math.abs(button - link)).toBeLessThanOrEqual(1);
    expect(Math.abs(button - form)).toBeLessThanOrEqual(1);
  });

  test("text contrast is at least 4.5:1 (WCAG AA), normal and hovered: test's button and example link, control's link", async ({ page }) => {
    await forceHeroVariant(page, "test");
    await openHome(page);
    await expect(sampleCta(page)).toHaveAttribute("data-variant", "test");
    for (const target of [sampleCta(page), exampleLink(page)]) {
      expect(await contrast(target), await target.innerText()).toBeGreaterThanOrEqual(4.5);
      await target.hover();
      await page.waitForTimeout(300);
      expect(await contrast(target), `${await target.innerText()} (hovered)`).toBeGreaterThanOrEqual(4.5);
      await page.mouse.move(0, 0);
    }

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await forceHeroVariant(page, "control");
    const campaign = await openHome(page);
    await waitForEvent(page, campaign, exposure);
    await sampleCta(page).hover();
    await page.waitForTimeout(300);
    expect(await contrast(sampleCta(page)), "control link (hovered)").toBeGreaterThanOrEqual(4.5);
  });
});

test("test: the example kit link opens the example kit, and the click is recorded with the variant", async ({ page }) => {
  await forceHeroVariant(page, "test");
  const campaign = await openHome(page);
  await waitForEvent(page, campaign, exposure);
  await exampleLink(page).click();
  await page.waitForURL((u) => u.pathname === EXAMPLE_KIT_PATH);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Snapshelf");
  const click = await waitForEvent(page, campaign, (e) => e.event === "hero_clicked" && e.properties.label === "See an example kit");
  expect(click.properties).toMatchObject({ element: "a", [`$feature/${FLAG}`]: "test" });
  expect(String(click.properties.link_url)).toMatch(/\/example-kit$/);
});

test("/example-kit: the brief step ends in a CTA to start your own preview, not the 'regenerate a preview' hint", async ({ page }) => {
  await page.goto(EXAMPLE_KIT_PATH);
  await page.getByTestId("stage-tab-Brief").click();
  const brief = page.locator('[data-task-id="brief.review"]');
  await expect(brief).toBeVisible();
  await expect(page.getByText(/regenerate a preview|Skim the brief above/)).toHaveCount(0);
  const cta = brief.getByTestId("task-cta");
  await expect(cta).toContainText("This is a sample kit. Want one for your product?");
  // The site's own wording for this button (as in the page header), on a 44px target.
  const start = cta.getByRole("link", { name: "Get my free preview" });
  await expect(start).toHaveAttribute("href", "/#start");
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await contrast(start), "Get my free preview").toBeGreaterThanOrEqual(4.5);
  await start.hover();
  await page.waitForTimeout(300);
  expect(await contrast(start), "Get my free preview (hovered)").toBeGreaterThanOrEqual(4.5);
  await start.click();
  await page.waitForURL((u) => u.pathname === "/" && u.hash === "#start");
  await expect(page.locator("#start")).toBeVisible();
});

test("/example-kit: the sample app's full kit from a fixed record, with nothing to unlock, buy or download, and not indexed", async ({ page }) => {
  const res = await page.goto(EXAMPLE_KIT_PATH);
  expect(res!.status()).toBe(200);
  const kit = page.getByTestId("example-kit");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Snapshelf");
  await expect(page.locator("#brief-heading")).toHaveText(EXAMPLE_KIT.brief.oneLiner);
  for (const feature of EXAMPLE_KIT.brief.features.slice(0, 3)) await expect(kit.getByText(feature, { exact: true }).first()).toBeVisible();

  // Every section is the real text, unlocked.
  await page.getByTestId("stage-tab-Product Hunt").click();
  const tagline = page.locator('[data-task-id="ph.tagline"]');
  await expect(tagline).toHaveAttribute("data-locked", "false");
  await expect(tagline).toContainText(EXAMPLE_KIT.content!.productHunt.tagline);
  await expect(page.locator('[data-locked="true"]')).toHaveCount(0);

  // Its share images render from the same record.
  await page.getByTestId("stage-tab-Images").click();
  const src = await page.locator('[data-task-id^="img."] img').first().getAttribute("src");
  expect(src).toMatch(new RegExp(`^/api/og/${EXAMPLE_KIT.id}/`));
  const image = await page.request.get(src!);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");

  await expect(page.getByRole("button", { name: /Unlock/ })).toHaveCount(0);
  await expect(page.getByText(/Download ZIP/)).toHaveCount(0);
  await expect(page.getByTestId("preview-paywall")).toHaveCount(0);
  expect(await page.locator(`a[href*="/api/kits/"], a[href*="checkout"]`).count()).toBe(0);
  // No buyer's address (the footer's contact address is outside the kit).
  expect(await kit.innerHTML()).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");

  // It isn't a stored kit: no kit route serves it, and its id under /kit/ goes to this page instead of a 200 not-found.
  const viaKitRoute = await page.request.get(`/kit/${EXAMPLE_KIT.id}`, { maxRedirects: 0 });
  expect(viaKitRoute.status()).toBe(308);
  expect(viaKitRoute.headers().location).toBe(EXAMPLE_KIT_PATH);
  expect((await page.request.get(`/api/kits/${EXAMPLE_KIT.id}/zip`)).status()).toBeGreaterThanOrEqual(400);
  expect((await page.request.get(`/api/kits/${EXAMPLE_KIT.id}/status`)).status()).toBeGreaterThanOrEqual(400);
});
