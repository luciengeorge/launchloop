import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { blogPosts, postPath } from "../../src/lib/blog";
import { contrast, expectNewsletterSurvivesNetworkFailure, makeSampleKit, recordLayoutShift, uniqueEmail } from "./helpers";

// Runs against the build with NEWSLETTER_INLINE=on (the inline-* projects); newsletter.spec.ts covers the flag-off pages.
const FIXTURE = "http://127.0.0.1:3419";
const freshIp = () => `203.1.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
test.beforeEach(async ({ context }) => context.setExtraHTTPHeaders({ "x-forwarded-for": freshIp() }));

const COPY = {
  postTitle: "Get my launch-day checklist",
  postBody: "I'll email it to you now, then one launch teardown a week. Short, practical, easy to unsubscribe.",
  homeTitle: "Not launching this week?",
  homeBody: "I'll email you my launch-day checklist now, then one launch teardown a week. Short, practical, easy to unsubscribe.",
  label: "Email for the launch-day checklist",
  button: "Send me the checklist",
};
const CHECKLIST = "/product-hunt-launch-checklist";

type PhEvent = { event: string; distinct_id?: string; properties: Record<string, unknown> };
const phEvents = async (request: APIRequestContext) => (await (await request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];

const footer = (page: Page) => page.getByRole("contentinfo");
const hydrated = (page: Page) => expect(page.locator('p[id^="newsletter-"]')).toHaveCount(0);

/** One promise per page: the footer points up at the inline block instead of offering a second form. */
async function expectFooterLink(page: Page) {
  const link = footer(page).getByTestId("footer-newsletter-link");
  await expect(link).toBeVisible();
  await expect(link).toHaveText("Sign up above");
  await expect(link).toHaveAttribute("href", "#newsletter");
  await expect(footer(page)).toContainText("Weekly launch teardowns. Sign up above");
  await expect(footer(page).getByRole("button", { name: "Subscribe" })).toBeHidden();
  await expect(footer(page).getByRole("form")).toHaveCount(0);
}

async function expectFooterForm(page: Page) {
  await expect(footer(page).getByRole("button", { name: "Subscribe" })).toBeVisible();
  await expect(footer(page).getByTestId("footer-newsletter-link")).toBeHidden();
}

for (const post of blogPosts()) {
  const path = postPath(post);

  test(`${path}: one inline signup right before the first top-level h2, no end-of-post block, and the footer links up to it`, async ({ page }) => {
    await page.goto(path);
    const block = page.getByTestId("inline-newsletter-post");
    await expect(block).toBeVisible();

    const place = await block.evaluate((el) => {
      const siblings = [...el.parentElement!.children];
      const firstH2 = siblings.find((s) => s.tagName === "H2");
      return { next: el.nextElementSibling === firstH2, before: siblings.slice(0, siblings.indexOf(el)).map((s) => s.tagName) };
    });
    expect(place.next).toBe(true);
    expect(place.before.length).toBeGreaterThanOrEqual(1);
    expect(place.before.every((tag) => tag === "P")).toBe(true);

    await expect(page.getByTestId("blog-newsletter")).toHaveCount(0);
    await expect(page.locator('[id="newsletter"]')).toHaveCount(1);
    await expect(block).toHaveAttribute("id", "newsletter");
    await expectFooterLink(page);

    // A titled aside, not a heading, so the post's outline is unchanged; the approved copy, word for word.
    await expect(block.getByRole("heading")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: COPY.postTitle })).toHaveCount(1);
    await expect(block.locator("#inline-newsletter-heading")).toHaveText(COPY.postTitle);
    await expect(block.locator("p").nth(1)).toHaveText(COPY.postBody);
    const titleColour = await block.locator("#inline-newsletter-heading").evaluate((el) => getComputedStyle(el).color);
    expect(titleColour).toBe(await page.locator("h1").evaluate((el) => getComputedStyle(el).color));
    await expect(block.locator("label")).toHaveText(COPY.label);
    await expect(block.locator("label")).toHaveClass(/\bsr-only\b/);
    await expect(block.getByRole("form", { name: COPY.postTitle })).toHaveAttribute("data-placement", "blog_inline");
    expect(await block.innerText()).not.toMatch(/[\u2013\u2014]/);

    // Outline, so the free-preview CTA further down stays the article's only filled orange button.
    const button = block.getByRole("button", { name: COPY.button });
    await expect(button).not.toHaveClass(/\bbg-primary\b/);
    await expect(block.locator(".bg-primary")).toHaveCount(0);
    await expect(page.locator("article").getByRole("link", { name: "Get a free preview" })).toHaveClass(/\bbg-primary\b/);
    await button.scrollIntoViewIfNeeded();
    expect(await contrast(button), "inline post button").toBeGreaterThanOrEqual(4.5);
  });
}

test("blog_inline: the no-JS error anchors are there for this placement until hydration", async ({ request }) => {
  const html = await (await request.get("/blog/how-to-launch-on-product-hunt")).text();
  for (const code of ["invalid", "reserved", "rate", "server"]) expect(html).toContain(`id="newsletter-blog_inline-${code}"`);
  expect(html).not.toContain('data-testid="blog-newsletter"');
});

test("/: a slim band directly after the hero and before #kit, and the footer links up to it", async ({ page }) => {
  await page.goto("/");
  const band = page.getByTestId("inline-newsletter-home");
  await expect(band).toBeVisible();
  expect(await band.evaluate((el) => [el.previousElementSibling?.id, el.nextElementSibling?.id])).toEqual(["start", "kit"]);
  // Outside the hero, so its tracking and experiment never see the band.
  expect(await band.evaluate((el) => el.closest("#start"))).toBeNull();
  await expect(band).toHaveAttribute("id", "newsletter");
  await expect(page.locator('[id="newsletter"]')).toHaveCount(1);
  await expect(band.getByRole("heading", { level: 2 })).toHaveText(COPY.homeTitle);
  await expect(band.locator("p").first()).toHaveText(COPY.homeBody);
  await expect(band.getByRole("form", { name: COPY.homeTitle })).toHaveAttribute("data-placement", "home_inline");
  expect(await band.innerText()).not.toMatch(/[\u2013\u2014]/);
  const button = band.getByRole("button", { name: COPY.button });
  await expect(button).not.toHaveClass(/\bbg-primary\b/);
  expect(await contrast(button), "home band button").toBeGreaterThanOrEqual(4.5);
  // The hero kit button stays the only filled orange button above the band.
  const kitButton = page.getByRole("form", { name: "Generate a launch kit" }).getByRole("button", { name: /Get my free preview/ });
  await expect(kitButton).toHaveClass(/\bbg-primary\b/);
  await expectFooterLink(page);
});

test("measured top of the home band, as the audit measured (getBoundingClientRect().top + scrollY)", async ({ page, isMobile }) => {
  test.skip(isMobile, "sets its own desktop and phone viewports");
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await hydrated(page);
    const top = await page.getByTestId("inline-newsletter-home").evaluate((el) => Math.round(el.getBoundingClientRect().top + window.scrollY));
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`home band top at ${viewport.width}x${viewport.height}: ${top}px of ${height}px`);
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(viewport.height * 2);
  }
});

test("pages without an inline signup keep the footer form: kit pages, tools, guides, pricing", async ({ page }) => {
  for (const path of ["/tools/product-hunt-tagline-checker", CHECKLIST, "/pricing", "/blog"]) {
    await page.goto(path);
    await expectFooterForm(page);
    await expect(page.locator('[id="newsletter"]')).toHaveCount(0);
    await expect(page.locator("[data-inline-newsletter]")).toHaveCount(0);
  }
  // makeSampleKit starts on / and moves to the kit client-side, and Next keeps / in the DOM, hidden, with its band.
  await makeSampleKit(page);
  await expectFooterForm(page);
  await expect(page.locator('[id="newsletter"]:visible')).toHaveCount(1);
  await expect(page.getByTestId("preview-newsletter")).toHaveAttribute("id", "newsletter");
});

test("client navigations: the footer follows the page shown, though Next keeps visited pages in the DOM, and its link goes to the visible block", async ({ page }) => {
  await page.goto("/");
  await expectFooterLink(page);
  await footer(page).getByRole("link", { name: "Pricing" }).click();
  await page.waitForURL((u) => u.pathname === "/pricing");
  await expectFooterForm(page);
  await page.goBack();
  await page.waitForURL((u) => u.pathname === "/");
  await expectFooterLink(page);

  await footer(page).getByRole("link", { name: "Blog", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/blog");
  await expectFooterForm(page);
  await page.getByRole("main").getByRole("link", { name: blogPosts()[0].title }).first().click();
  await page.waitForURL((u) => u.pathname === postPath(blogPosts()[0]));
  await expectFooterLink(page);
  await hydrated(page);
  await footer(page).getByTestId("footer-newsletter-link").click();
  const field = page.getByTestId("inline-newsletter-post").getByLabel(COPY.label);
  await expect(field).toBeFocused();
  await expect(field).toBeInViewport();
});

for (const [placement, path, testId] of [
  ["blog_inline", "/blog/how-to-launch-on-indie-hackers", "inline-newsletter-post"],
  ["home_inline", "/", "inline-newsletter-home"],
] as const) {
  test(`${placement}: a JS signup posts its placement, shows the success state in the block, and is recorded as ${placement}`, async ({ page }) => {
    await page.goto(path);
    const block = page.getByTestId(testId);
    await hydrated(page);
    const request = page.waitForRequest((r) => r.url().endsWith("/api/newsletter") && r.method() === "POST");
    await block.getByLabel(COPY.label).fill(uniqueEmail(placement));
    await block.getByRole("button", { name: COPY.button }).click();
    const body = (await request).postDataJSON() as { placement: string; analyticsId: string };
    expect(body.placement).toBe(placement);
    const done = block.getByRole("status");
    await expect(done).toHaveAttribute("data-welcome", "sent");
    await expect(done.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
    await expect(page.getByTestId(`newsletter-done-${placement}`)).toHaveCount(1);
    let event: PhEvent | undefined;
    await expect.poll(async () => (event = (await phEvents(page.request)).find((e) => e.event === "newsletter_subscribed" && e.distinct_id === body.analyticsId))).toBeTruthy();
    expect(event!.properties).toMatchObject({ placement, submitted: "js", welcome: "sent" });
  });

  test(`${placement}: a plain form post comes back to the block with ?from=${placement}#newsletter and the success state`, async ({ page }) => {
    await page.goto(path);
    const block = page.getByTestId(testId);
    await block.getByLabel(COPY.label).fill(uniqueEmail(`${placement}-nojs`));
    // form.submit() skips React's onSubmit, exactly like a submit that lands before hydration.
    await block.getByRole("form").evaluate((form: HTMLFormElement) => form.submit());
    await page.waitForURL((u) => u.pathname === path && u.searchParams.get("subscribed") === "1" && u.searchParams.get("from") === placement && u.hash === "#newsletter");
    expect(page.url()).not.toContain("example.com");
    await expect(block.getByRole("status")).toContainText("You're subscribed");
    await expect(block.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
    await expect(page.locator('[data-testid^="newsletter-done-"]')).toHaveCount(1);
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the inline post signup posts and is counted as blog_inline, submitted: form", async ({ page }) => {
    const path = "/blog/product-hunt-alternatives";
    await page.goto(path);
    const block = page.getByTestId("inline-newsletter-post");
    await block.getByLabel(COPY.label).fill(uniqueEmail("inline-nojs"));
    await block.getByRole("button", { name: COPY.button }).click();
    await page.waitForURL((u) => u.pathname === path && u.searchParams.get("subscribed") === "1" && u.searchParams.get("from") === "blog_inline" && u.hash === "#newsletter");
    await expect
      .poll(async () => (await phEvents(page.request)).some((e) => e.event === "newsletter_subscribed" && e.properties.placement === "blog_inline" && e.properties.submitted === "form"))
      .toBe(true);
  });

  test("an invalid post lands on the inline block's own error message", async ({ page, request }) => {
    const res = await request.post("/api/newsletter", { form: { email: "not-an-email", placement: "home_inline", next: "/" }, maxRedirects: 0 });
    expect(res.headers().location).toBe("/?subscribed=0&error=invalid&from=home_inline#newsletter-home_inline-invalid");
    await page.goto(res.headers().location);
    await expect(page.getByTestId("inline-newsletter-home").getByText("Enter a valid email address.")).toBeVisible();
    await expect(footer(page).getByText("Enter a valid email address.")).toBeHidden();
  });
});

test.describe("newsletter_form_viewed", () => {
  test.use({
    // posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver).
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  });
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
      Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
    });
  });

  const viewed = async (request: APIRequestContext, campaign: string) =>
    (await phEvents(request)).filter((e) => e.event === "newsletter_form_viewed" && e.properties.utm_campaign === campaign);

  for (const [placement, path, testId] of [
    ["blog_inline", "/blog/how-to-launch-on-betalist", "inline-newsletter-post"],
    ["home_inline", "/", "inline-newsletter-home"],
  ] as const) {
    test(`${placement}: fires once when half on screen, with the path and UTMs, and the hidden footer form never reports`, async ({ page }) => {
      const campaign = `inline-viewed-${placement}-${Date.now()}`;
      await page.goto(`${path}?utm_source=devhunt&utm_medium=directory&utm_campaign=${campaign}`);
      await page.getByTestId(testId).scrollIntoViewIfNeeded();
      await expect.poll(async () => (await viewed(page.request, campaign)).filter((e) => e.properties.placement === placement).length).toBe(1);
      const event = (await viewed(page.request, campaign)).find((e) => e.properties.placement === placement)!;
      expect(event.properties).toMatchObject({ placement, path, utm_source: "devhunt", utm_medium: "directory", utm_campaign: campaign });
      expect(JSON.stringify(event.properties)).not.toContain("@");

      // Typing into the band isn't a hero click: the band is outside HomeHero.
      await page.getByTestId(testId).getByLabel(COPY.label).click();
      await page.keyboard.type(`${placement}-typed@example.com`);
      await footer(page).scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      const events = await viewed(page.request, campaign);
      expect(events.filter((e) => e.properties.placement === placement)).toHaveLength(1);
      expect(events.filter((e) => e.properties.placement === "footer")).toEqual([]);
      const all = (await phEvents(page.request)).filter((e) => e.properties.utm_campaign === campaign);
      expect(all.filter((e) => e.event === "hero_clicked" && e.properties.label === COPY.label)).toEqual([]);
      expect(JSON.stringify(all)).not.toContain("typed@example.com");
    });
  }
});

for (const path of ["/", "/blog/how-to-launch-on-product-hunt"]) {
  test(`${path}: the inline block causes no layout shift through load and hydration`, async ({ page }) => {
    const cls = await recordLayoutShift(page);
    await page.goto(path, { waitUntil: "load" });
    await hydrated(page);
    await page.waitForTimeout(1000);
    expect(await cls()).toBe(0);
  });
}

for (const { placement, path, testId } of [
  { placement: "blog_inline", path: "/blog/how-to-launch-on-product-hunt", testId: "inline-newsletter-post" },
  { placement: "home_inline", path: "/", testId: "inline-newsletter-home" },
]) {
  test(`${placement}: a network failure keeps the email, says to try again, and the retry subscribes`, async ({ page }) => {
    await page.goto(path);
    await expectNewsletterSurvivesNetworkFailure(page, page.getByTestId(testId), { label: COPY.label, button: COPY.button });
  });
}
