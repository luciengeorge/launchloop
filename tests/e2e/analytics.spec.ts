import { expect, test, type Page } from "@playwright/test";
import { followMagicLink, uniqueEmail } from "./helpers";

const FIXTURE = "http://127.0.0.1:3419";

interface PhEvent {
  event: string;
  distinct_id?: string;
  properties: Record<string, unknown>;
}

test.use({
  // posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver).
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  // Own preview rate-limit bucket, so these previews don't eat the budget the other specs share.
  extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}` },
});
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });
});

const distinctId = (e: PhEvent) => e.distinct_id ?? (e.properties.distinct_id as string | undefined);

/** Everything the fake PostHog has received so far, from the browser (via /lp-relay) and the server. */
async function phEvents(page: Page): Promise<PhEvent[]> {
  return (await (await page.request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];
}

/** Waits for a browser event tagged with this test's utm_campaign. */
async function campaignEvent(page: Page, campaign: string, event: string): Promise<PhEvent> {
  let found: PhEvent | undefined;
  await expect
    .poll(async () => {
      found = (await phEvents(page)).find((e) => e.event === event && e.properties.utm_campaign === campaign);
      return found;
    })
    .toBeTruthy();
  return found!;
}

async function serverEvent(page: Page, id: string, event: string): Promise<PhEvent> {
  let found: PhEvent | undefined;
  await expect
    .poll(async () => {
      found = (await phEvents(page)).find((e) => e.event === event && distinctId(e) === id);
      return found;
    })
    .toBeTruthy();
  return found!;
}

test("$pageview carries utm_source / utm_medium / utm_campaign, and later events on the page keep them", async ({ page }) => {
  const campaign = `week2-${Date.now()}`;
  const utm = `utm_source=x&utm_medium=social&utm_campaign=${campaign}`;
  await page.goto(`/?${utm}`);

  const pageview = await campaignEvent(page, campaign, "$pageview");
  expect(pageview.properties).toMatchObject({ utm_source: "x", utm_medium: "social", utm_campaign: campaign });
  expect(pageview.properties.$current_url).toContain(`?${utm}`);

  // The in-page start link rewrites the URL but keeps the UTMs, so a reload still attributes.
  await page.getByRole("main").getByRole("link", { name: "Get my free preview" }).first().click();
  await expect.poll(() => new URL(page.url()).search).toBe(`?${utm}`);
  expect(new URL(page.url()).hash).toBe("#start");

  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  const started = await campaignEvent(page, campaign, "preview_started");
  expect(started.properties).toMatchObject({ utm_source: "x", utm_medium: "social" });
  expect(distinctId(started)).toBe(distinctId(pageview));
  expect((await campaignEvent(page, campaign, "preview_completed")).properties.utm_source).toBe("x");
});

test("header CTA from another page keeps the visitor's id and UTMs, through to the server-side purchase event", async ({ page }) => {
  const campaign = `hn-${Date.now()}`;
  await page.goto(`/faq?utm_source=hn&utm_medium=social&utm_campaign=${campaign}`);
  const pageview = await campaignEvent(page, campaign, "$pageview");
  const id = distinctId(pageview)!;

  // Hydrated, so the link navigates client-side rather than as a plain anchor.
  await page.waitForLoadState("networkidle");
  await page.getByRole("banner").getByRole("link", { name: "Get my launch kit" }).click();
  await page.waitForURL((u) => u.pathname === "/" && u.search === "?plan=kit" && u.hash === "#start");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  const started = await campaignEvent(page, campaign, "preview_started");
  expect(distinctId(started)).toBe(id);
  expect(started.properties.utm_source).toBe("hn");

  // Kit intent, logged out: email, magic link (carries the id), then (mock) checkout.
  await page.waitForURL(/\/kit\/[\w-]+\?unlock=1$/);
  const email = uniqueEmail("utm-purchase");
  await page.getByLabel("Your email").fill(email);
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "sent");
  await followMagicLink(page, email);
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  await page.getByRole("button", { name: "Pay £19 (test mode)" }).click();
  await page.waitForURL(/\/account\/kits\/[\w-]+\?paid=1&aid=/);

  const checkoutStarted = await serverEvent(page, id, "checkout_started");
  expect(checkoutStarted.properties).toMatchObject({ plan: "kit", product_type: "kit", amount: 1900, currency: "gbp", "$feature/exp_launch14_promo": "control" });
  const purchase = await serverEvent(page, id, "checkout_completed");
  expect(purchase.properties).toMatchObject({ plan: "kit", product_type: "kit", amount: 1900, currency: "gbp", mock: true });
  expect(JSON.stringify(purchase)).not.toContain("@example.com");
});

test("navigating before the PostHog SDK loads still records the landing pageview and keeps its UTMs", async ({ page }) => {
  const campaign = `early-nav-${Date.now()}`;
  let sdkRequested!: () => void;
  const requested = new Promise<void>((resolve) => (sdkRequested = resolve));
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  // Hold back the lazily loaded SDK chunk (only posthog-js contains this event name) until after the navigation.
  await page.route("**/_next/static/**/*.js", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (body.includes("$feature_flag_called")) {
      sdkRequested();
      await released;
    }
    await route.fulfill({ response, body });
  });

  await page.goto(`/?utm_source=hn&utm_medium=social&utm_campaign=${campaign}`);
  // The SDK is only requested after the load event, so the page has hydrated and the link navigates client-side.
  await requested;
  await page.getByRole("banner").getByRole("link", { name: "Pricing" }).click();
  await page.waitForURL((u) => u.pathname === "/pricing");
  release();

  let pageviews: PhEvent[] = [];
  await expect
    .poll(async () => {
      pageviews = (await phEvents(page)).filter((e) => e.event === "$pageview" && e.properties.utm_campaign === campaign);
      return pageviews.map((e) => e.properties.$pathname).sort();
    })
    .toEqual(["/", "/pricing"]);
  const landing = pageviews.find((e) => e.properties.$pathname === "/")!;
  const pricing = pageviews.find((e) => e.properties.$pathname === "/pricing")!;
  expect(landing.properties).toMatchObject({ utm_source: "hn", utm_medium: "social" });
  expect(landing.properties.$current_url).toContain(`utm_campaign=${campaign}`);
  expect(pricing.properties.utm_source).toBe("hn");
  expect(distinctId(pricing)).toBe(distinctId(landing));
});
