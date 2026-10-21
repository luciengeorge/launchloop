import { expect, test, type Page } from "@playwright/test";
import { EXAMPLE_KIT_PATH } from "@/lib/site";

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

async function startSample(page: Page, campaign: string): Promise<PhEvent> {
  await sampleCta(page).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  return waitForEvent(page, campaign, (e) => e.event === "preview_started");
}

test("test: the sample app is a visible button and the hero links to the example kit; the exposure and preview_started say test", async ({ page }) => {
  await forceHeroVariant(page, "test");
  const campaign = await openHome(page);

  await expect(sampleCta(page)).toHaveAttribute("data-variant", "test");
  await expect(sampleCta(page)).toBeVisible();
  // A real button, not a line of underlined text.
  expect((await sampleCta(page).boundingBox())!.height).toBeGreaterThanOrEqual(32);
  const example = page.locator("#start").getByRole("link", { name: "See an example kit" });
  await expect(example).toBeVisible();
  await expect(example).toHaveAttribute("href", EXAMPLE_KIT_PATH);

  expect((await waitForEvent(page, campaign, exposure)).properties).toMatchObject({ $feature_flag_response: "test", [`$feature/${FLAG}`]: "test" });
  const started = await startSample(page, campaign);
  expect(started.properties).toMatchObject({ source: "sample", [`$feature/${FLAG}`]: "test" });
  expect(started.properties).not.toHaveProperty(`fallback/${FLAG}`);
  // The kit page the visitor lands on (a client navigation) is still split by what the hero showed.
  expect((await waitForEvent(page, campaign, (e) => e.event === "preview_completed")).properties[`$feature/${FLAG}`]).toBe("test");
});

test("control assignment: the quiet sample link and no example kit; the exposure and preview_started say control", async ({ page }) => {
  await forceHeroVariant(page, "control");
  const campaign = await openHome(page);

  expect((await waitForEvent(page, campaign, exposure)).properties).toMatchObject({ $feature_flag_response: "control" });
  await expect(sampleCta(page)).toHaveAttribute("data-variant", "control");
  await expect(page.getByTestId("example-kit-link")).toHaveCount(0);
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

test("test: the example kit link opens the kit page, and the click is recorded with the variant and no kit id", async ({ page }) => {
  await forceHeroVariant(page, "test");
  const campaign = await openHome(page);
  await waitForEvent(page, campaign, exposure);
  const example = page.getByTestId("example-kit-link");
  const navigation = page.waitForURL((u) => u.pathname === EXAMPLE_KIT_PATH);
  await example.click();
  await navigation;
  const click = await waitForEvent(page, campaign, (e) => e.event === "hero_clicked" && e.properties.label === "See an example kit");
  expect(click.properties).toMatchObject({ element: "a", [`$feature/${FLAG}`]: "test" });
  expect(String(click.properties.link_url)).toMatch(/\/kit\/\[id\]$/);
});
