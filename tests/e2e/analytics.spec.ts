import { expect, test, type Page, type Request } from "@playwright/test";
import { makeSampleKit, uniqueEmail } from "./helpers";

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
// holdPostHogSdk's handler can still be running when a test ends; detach it without waiting so it can't fail the next test.
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "ignoreErrors" }));
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

async function serverEvent(page: Page, id: string, event: string, match: (e: PhEvent) => boolean = () => true): Promise<PhEvent> {
  let found: PhEvent | undefined;
  await expect
    .poll(async () => {
      found = (await phEvents(page)).find((e) => e.event === event && distinctId(e) === id && match(e));
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

test("newsletter_subscribed says which signup it came from: footer or post-preview", async ({ page }) => {
  const campaign = `news-${Date.now()}`;
  await page.goto(`/?utm_source=newsletter-test&utm_campaign=${campaign}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("contentinfo").getByLabel("Weekly launch teardowns").fill(uniqueEmail("ph-footer"));
  await page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" }).click();
  expect((await campaignEvent(page, campaign, "newsletter_subscribed")).properties).toMatchObject({ placement: "footer", welcome: "sent" });

  const previewCampaign = `${campaign}-preview`;
  await page.goto(`/?utm_source=newsletter-test&utm_campaign=${previewCampaign}`);
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  const signup = page.getByTestId("preview-newsletter");
  await signup.getByLabel("Email for the launch-day checklist").fill(uniqueEmail("ph-preview"));
  await signup.getByRole("button", { name: "Send me the checklist" }).click();
  const event = await campaignEvent(page, previewCampaign, "newsletter_subscribed");
  expect(event.properties).toMatchObject({ placement: "preview", welcome: "sent" });
  expect(JSON.stringify(event)).not.toContain("@example.com");
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

  // Kit intent, logged out: /kit/[id]?unlock=1 goes straight on to (mock) guest checkout, then the guest success page (carries the id).
  const email = uniqueEmail("utm-purchase");
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  await page.getByLabel("Email for your receipt and kit").fill(email);
  await page.getByRole("button", { name: "Pay £19 (test mode)" }).click();
  await page.waitForURL(/\/checkout\/success\?kit=[\w-]+&session_id=[\w-]+&aid=/);

  // First touch rides on the kit, so it survives the full page loads to and from checkout without cookies or storage.
  const firstTouch = { utm_source: "hn", utm_medium: "social", utm_campaign: campaign };
  const checkoutStarted = await serverEvent(page, id, "checkout_started");
  expect(checkoutStarted.properties).toMatchObject({ plan: "kit", product_type: "kit", amount: 1900, currency: "gbp", "fallback/exp_launch14_promo": "control", ...firstTouch });
  // The fake PostHog assigns nothing, so the £19 the page served was a fallback, not an experiment arm.
  expect(checkoutStarted.properties).not.toHaveProperty("$feature/exp_launch14_promo");
  const purchase = await serverEvent(page, id, "checkout_completed");
  expect(purchase.properties).toMatchObject({ plan: "kit", product_type: "kit", amount: 1900, currency: "gbp", mock: true, ...firstTouch });
  for (const e of [pageview, started, checkoutStarted, purchase]) expect(e.properties).not.toHaveProperty("is_test");
  expect(JSON.stringify(purchase)).not.toContain("@example.com");
  expect(await page.context().cookies()).not.toContainEqual(expect.objectContaining({ value: expect.stringContaining(campaign) }));
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))).not.toContain(campaign);
});

test("the preview request carries first-touch UTMs and the referring domain from the landing page", async ({ page }) => {
  const campaign = `ft-${Date.now()}`;
  await page.goto(`/faq?utm_source=reddit&utm_medium=social&utm_campaign=${campaign}&utm_content=${"x".repeat(300)}`, { referer: "https://www.reddit.com/r/SideProject/" });
  await page.waitForLoadState("networkidle");
  await page.getByRole("banner").getByRole("link", { name: "Get my launch kit" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  const request = page.waitForRequest((r) => r.url().endsWith("/api/kits") && r.method() === "POST");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  const body = (await request).postDataJSON() as { attribution: Record<string, string> };
  expect(body.attribution).toMatchObject({ utm_source: "reddit", utm_medium: "social", utm_campaign: campaign, referring_domain: "reddit.com" });
  expect(body.attribution.utm_content).toHaveLength(200);
});

/**
 * Holds back the lazily loaded PostHog SDK chunk (only posthog-js contains `$lib_version`) until `release()`.
 * `requested` resolves when the page asks for it: after the load event, or earlier if something needs PostHog.
 */
async function holdPostHogSdk(page: Page) {
  let markRequested!: () => void;
  const requested = new Promise<void>((resolve) => (markRequested = resolve));
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/_next/static/**/*.js", async (route) => {
    try {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes("$lib_version")) {
        markRequested();
        await released;
      }
      await route.fulfill({ response, body });
    } catch {
      // The page moved on (on to checkout, or the test ended) while this chunk was in flight.
      await route.continue().catch(() => {});
    }
  });
  return { requested, release };
}

const isCheckout = (r: Request) => r.method() === "POST" && new URL(r.url()).pathname === "/api/checkout";

test("navigating before the PostHog SDK loads still records the landing pageview and keeps its UTMs", async ({ page }) => {
  const campaign = `early-nav-${Date.now()}`;
  const sdk = await holdPostHogSdk(page);

  await page.goto(`/?utm_source=hn&utm_medium=social&utm_campaign=${campaign}`);
  // The SDK is only requested after the load event, so the page has hydrated and the link navigates client-side.
  await sdk.requested;
  await page.getByRole("banner").getByRole("link", { name: "Pricing" }).click();
  await page.waitForURL((u) => u.pathname === "/pricing");
  sdk.release();

  let pageviews: PhEvent[] = [];
  await expect
    .poll(async () => {
      pageviews = (await phEvents(page)).filter((e) => e.event === "$pageview" && e.properties.utm_campaign === campaign);
      return pageviews.map((e) => e.properties.$pathname).sort();
    })
    .toEqual(["/", "/pricing"]);
  const landing = pageviews.find((e) => e.properties.$pathname === "/")!;
  const pricing = pageviews.find((e) => e.properties.$pathname === "/pricing")!;
  expect(landing.properties).toMatchObject({ utm_source: "hn", utm_medium: "social", env: expect.any(String), is_webdriver: false });
  expect(landing.properties.$current_url).toContain(`utm_campaign=${campaign}`);
  expect(pricing.properties.utm_source).toBe("hn");
  expect(distinctId(pricing)).toBe(distinctId(landing));
});

test("a preview started before the PostHog SDK loads: its events wait for the SDK, and first touch and the server trace don't", async ({ page }) => {
  const campaign = `early-preview-${Date.now()}`;
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  const sdk = await holdPostHogSdk(page);

  await page.goto(`/?utm_source=hn&utm_medium=social&utm_campaign=${campaign}&qa=1`, { referer: "https://news.ycombinator.com/item?id=1" });
  await sdk.requested;
  const kitRequest = page.waitForRequest((r) => r.url().endsWith("/api/kits") && r.method() === "POST");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  const body = (await kitRequest).postDataJSON() as { attribution: Record<string, string> };
  expect(body.attribution).toMatchObject({ utm_source: "hn", utm_medium: "social", utm_campaign: campaign, referring_domain: "news.ycombinator.com" });
  await page.waitForURL(/\/kit\/[\w-]+$/);
  const kitId = new URL(page.url()).pathname.split("/").pop()!;

  // The server's kit_created doesn't wait for the browser SDK, and it's on the id the page will use.
  const created = await campaignEvent(page, campaign, "kit_created");
  expect(created.properties).toMatchObject({ kitId, source: "sample", stream: true, utm_source: "hn", referring_domain: "news.ycombinator.com", is_test: true });
  // Browser events are queued, not dropped: none for this visit has reached PostHog while the SDK is held.
  expect((await phEvents(page)).filter((e) => e.properties.utm_campaign === campaign && e.event !== "kit_created")).toEqual([]);
  sdk.release();

  const started = await campaignEvent(page, campaign, "preview_started");
  const completed = await campaignEvent(page, campaign, "preview_completed");
  expect(started.properties).toMatchObject({ source: "sample", utm_source: "hn", qa: true });
  expect(completed.properties.kitId).toBe(kitId);
  let landing: PhEvent | undefined;
  await expect
    .poll(async () => {
      landing = (await phEvents(page)).find((e) => e.event === "$pageview" && e.properties.$pathname === "/" && e.properties.utm_campaign === campaign);
      return landing;
    })
    .toBeTruthy();
  expect(distinctId(started)).toBe(distinctId(landing!));
  expect(distinctId(completed)).toBe(distinctId(landing!));
  expect(distinctId(created)).toBe(distinctId(landing!));

  // The server traces the preview whatever the browser SDKs are doing.
  await expect
    .poll(async () => {
      const spans = (await (await page.request.get(`${FIXTURE}/sentry/_spans`)).json()) as { name: string; attributes?: Record<string, { value: unknown }> }[];
      return spans.some((s) => s.name === "kits.request" && s.attributes?.["kit.id"]?.value === kitId);
    })
    .toBe(true);
  expect(pageErrors).toEqual([]);
});

test("a guest checkout started before the PostHog SDK loads waits for it and joins the funnel on the page's id", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  const sdk = await holdPostHogSdk(page);
  await page.goto(`/kit/${kitId}`);
  await sdk.requested;

  const unlock = page.getByRole("button", { name: "Unlock the full kit, £19" });
  await expect(unlock).toBeEnabled();
  const checkout = page.waitForRequest(isCheckout);
  await unlock.click();
  // The checkout request carries the page's analytics id, so it waits for the SDK rather than going without one.
  await page.waitForTimeout(500);
  expect(page.url()).toContain(`/kit/${kitId}`);
  sdk.release();

  const analyticsId = ((await checkout).postDataJSON() as { analyticsId?: string }).analyticsId;
  expect(analyticsId).toBeTruthy();
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  expect((await serverEvent(page, analyticsId!, "checkout_started")).properties).toMatchObject({ product_type: "kit", amount: 1900 });
  const pageview = await serverEvent(page, analyticsId!, "$pageview");
  expect(pageview.properties.$pathname).toBe("/kit/[id]");
});

test("clicks are captured in the hero only, never what's typed; leaving the page sends $pageleave; no session replay", async ({ page }) => {
  const campaign = `clicks-${Date.now()}`;
  const replayRequests: string[] = [];
  page.on("request", (r) => {
    if (/\/lp-relay\/(s|ses)\//.test(new URL(r.url()).pathname)) replayRequests.push(r.url());
  });
  await page.goto(`/?utm_campaign=${campaign}`);
  await campaignEvent(page, campaign, "$pageview");

  const secret = `secret-owner-${Date.now()}/private-repo`;
  const input = page.getByLabel("GitHub repo or live site URL");
  await input.click();
  await input.fill(`github.com/${secret}`);
  // Outside the hero: an FAQ question (a button) and the footer's newsletter field.
  await page.getByTestId("faq-question").first().click();
  await page.getByRole("contentinfo").getByLabel("Weekly launch teardowns").click();
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);

  await campaignEvent(page, campaign, "preview_started");
  await expect
    .poll(async () =>
      (await phEvents(page))
        .filter((e) => e.properties.utm_campaign === campaign && (e.event === "hero_clicked" || e.event === "$autocapture"))
        .map((e) => ({ event: e.event, element: e.properties.element, label: e.properties.label })),
    )
    .toEqual([
      { event: "hero_clicked", element: "input", label: "GitHub repo or live site URL" },
      { event: "hero_clicked", element: "button", label: "Try a sample app" },
    ]);

  // Leaving the home page (pagehide: closing the tab or a full page load) sends $pageleave for it by beacon. Headless
  // Chromium drops beacons sent while page.goto unloads the page, so fire the event the browser would.
  const leaving = `${campaign}-leave`;
  await page.goto(`/?utm_campaign=${leaving}`);
  await campaignEvent(page, leaving, "$pageview");
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false })));
  expect((await campaignEvent(page, leaving, "$pageleave")).properties.$pathname).toBe("/");

  const everything = JSON.stringify(await phEvents(page));
  expect(everything).not.toContain(secret);
  expect(replayRequests).toEqual([]);
});

test("QA traffic: every browser and server event carries is_test, through client navigations, a reload and checkout", async ({ page }) => {
  const campaign = `qa-${Date.now()}`;
  await page.goto(`/?utm_source=qa&utm_medium=internal&utm_campaign=${campaign}&qa=1`);
  const landing = await campaignEvent(page, campaign, "$pageview");
  expect(landing.properties).toMatchObject({ is_test: true, qa: true });
  // The URL scrubber keeps only utm_* tags, so is_test (not $current_url) is what marks the visit.
  expect(landing.properties.$current_url).not.toContain("qa=1");

  // Client navigation into the kit: the preview events and the paywall's flag event keep the tag.
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  for (const name of ["preview_started", "preview_completed"]) expect((await campaignEvent(page, campaign, name)).properties.is_test).toBe(true);
  const firstView = distinctId(landing)!;
  const served = await serverEvent(page, firstView, "flag_fallback", (e) => e.properties.flag === "exp_launch14_promo");
  expect(served.properties).toMatchObject({ flag: "exp_launch14_promo", is_test: true });

  // A full reload drops the tag from the URL and gets a new anonymous id; the tab still remembers it's QA.
  await page.reload();
  const unlock = page.getByRole("button", { name: "Unlock the full kit, £19" });
  await expect(unlock).toBeEnabled();
  const checkout = page.waitForRequest(isCheckout);
  await unlock.click();
  const body = (await checkout).postDataJSON() as { analyticsId: string; isTest?: boolean };
  expect(body.isTest).toBe(true);
  expect(body.analyticsId).not.toBe(firstView);
  const reloaded = await serverEvent(page, body.analyticsId, "$pageview");
  expect(reloaded.properties).toMatchObject({ $pathname: "/kit/[id]", is_test: true });
  expect((await serverEvent(page, body.analyticsId, "checkout_started")).properties).toMatchObject({ plan: "kit", utm_source: "qa", is_test: true });

  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  await page.getByLabel("Email for your receipt and kit").fill(uniqueEmail("qa-purchase"));
  await page.getByRole("button", { name: "Pay £19 (test mode)" }).click();
  await page.waitForURL(/\/checkout\/success\?/);
  expect((await serverEvent(page, body.analyticsId, "checkout_completed")).properties).toMatchObject({ mock: true, is_test: true });
  const events = (await phEvents(page)).filter((e) => [firstView, body.analyticsId].includes(distinctId(e)!));
  expect(events.filter((e) => e.properties.is_test !== true).map((e) => e.event)).toEqual([]);
});
