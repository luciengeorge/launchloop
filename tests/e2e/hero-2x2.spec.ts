import { expect, test, type Page } from "@playwright/test";
import { HERO_HEADLINE_CONTROL, HERO_HEADLINE_TEST } from "../../src/lib/hero-headline";
import { setHeroHeadline } from "./helpers";

// Runs against the HERO_EXPERIMENT=1 build (projects hero-desktop and hero-mobile), where both hero flags are live.

const FIXTURE = "http://127.0.0.1:3419";
const HEADLINE = "exp_hero_headline";
const SAMPLE_CTA = "exp_hero_sample_cta";

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
test.afterEach(async ({ page, request }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await setHeroHeadline(request, null);
});

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

const exposureOf = (flag: string) => (e: PhEvent) => e.event === "$feature_flag_called" && e.properties.$feature_flag === flag;

test("server/client mismatch with instant flags: the sample CTA exposure carries the headline shown, on every load", async ({ page }) => {
  // The server renders control; posthog-js, evaluating the headline flag for the page's own id, says test, with no latency.
  await setHeroHeadline(page.request, "control");
  await page.route(/\/lp-relay\/flags/, (route) =>
    route.fulfill({
      json: {
        flags: {
          [SAMPLE_CTA]: { key: SAMPLE_CTA, enabled: true, variant: "test", reason: null, metadata: {} },
          [HEADLINE]: { key: HEADLINE, enabled: true, variant: "test", reason: null, metadata: {} },
        },
        errorsWhileComputingFlags: false,
      },
    }),
  );
  for (let run = 0; run < 6; run++) {
    const campaign = `mismatch-${run}-${Date.now()}`;
    await page.goto(`/?utm_campaign=${campaign}`);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(HERO_HEADLINE_CONTROL);
    const exposure = await waitForEvent(page, campaign, exposureOf(SAMPLE_CTA));
    expect(exposure.properties, `run ${run}`).toMatchObject({ $feature_flag_response: "test", [`$feature/${SAMPLE_CTA}`]: "test", [`$feature/${HEADLINE}`]: "control" });
    expect((await waitForEvent(page, campaign, exposureOf(HEADLINE))).properties.$feature_flag_response).toBe("control");
  }
});

for (const headline of ["control", "test"] as const) {
  for (const sampleCta of ["control", "test"] as const) {
    test(`2×2 arm: headline ${headline}, sample CTA ${sampleCta}: both shown, both exposed, and preview_started carries both`, async ({ page }) => {
      // The headline is assigned on the server (fake PostHog), the sample CTA in the browser: independent flags.
      await setHeroHeadline(page.request, headline);
      await page.route(/\/lp-relay\/flags/, (route) =>
        route.fulfill({ json: { flags: { [SAMPLE_CTA]: { key: SAMPLE_CTA, enabled: true, variant: sampleCta, reason: null, metadata: {} } }, errorsWhileComputingFlags: false } }),
      );
      const campaign = `2x2-${headline}-${sampleCta}-${Date.now()}`;
      await page.goto(`/?utm_campaign=${campaign}`);

      await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(headline === "test" ? HERO_HEADLINE_TEST : HERO_HEADLINE_CONTROL);
      // Wait for the sample CTA's own answer before touching the hero (touching it first freezes it to control).
      expect((await waitForEvent(page, campaign, exposureOf(SAMPLE_CTA))).properties.$feature_flag_response).toBe(sampleCta);
      expect((await waitForEvent(page, campaign, exposureOf(HEADLINE))).properties.$feature_flag_response).toBe(headline);
      await expect(page.getByRole("button", { name: "Try a sample app" })).toHaveAttribute("data-variant", sampleCta);
      await expect(page.getByTestId("example-kit-link")).toHaveCount(sampleCta === "test" ? 1 : 0);

      await page.getByRole("button", { name: "Try a sample app" }).click();
      await page.waitForURL(/\/kit\/[\w-]+$/);
      for (const name of ["hero_clicked", "preview_started", "preview_completed"]) {
        const event = await waitForEvent(page, campaign, (e) => e.event === name);
        expect(event.properties, name).toMatchObject({ [`$feature/${HEADLINE}`]: headline, [`$feature/${SAMPLE_CTA}`]: sampleCta });
      }
    });
  }
}
