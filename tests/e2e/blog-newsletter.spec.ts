import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { BLOG_POSTS, postPath } from "../../src/lib/blog";
import { uniqueEmail } from "./helpers";

// Newsletter posts are limited per IP, so every test (and every direct API call) gets its own bucket.
const freshIp = () => `203.0.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
test.beforeEach(async ({ context }) => context.setExtraHTTPHeaders({ "x-forwarded-for": freshIp() }));

const CHECKLIST = "/product-hunt-launch-checklist";
const COPY = {
  heading: "Get my launch-day checklist",
  body: "I'll email it to you now, then one launch teardown a week. Short, practical, easy to unsubscribe.",
  label: "Email for the launch-day checklist",
  button: "Send me the checklist",
};

async function welcomeEmails(request: APIRequestContext, email: string) {
  const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string }[] };
  return emails.filter((e) => e.to === email && e.subject === "Your launch-day checklist");
}

const expectOneWelcomeEmail = (request: APIRequestContext, email: string) => expect.poll(async () => (await welcomeEmails(request, email)).length).toBe(1);

const blogSignup = (page: Page) => page.getByTestId("blog-newsletter");
const footer = (page: Page) => page.getByRole("contentinfo");

/** The form drops its no-JS error anchors once React has hydrated it. */
const hydrated = (page: Page) => expect(blogSignup(page).locator('[id^="newsletter-blog-"]')).toHaveCount(0);

/** The footer form hasn't reacted: still a form, no message. */
async function expectFooterIdle(page: Page) {
  await expect(footer(page).getByRole("button", { name: "Subscribe" })).toBeVisible();
  await expect(footer(page).getByRole("status")).toHaveCount(0);
  await expect(footer(page).getByRole("alert")).toHaveCount(0);
}

for (const p of BLOG_POSTS) {
  const path = postPath(p);

  test(`${path}: one signup right after the preview CTA and before the related links, with the approved copy and an outline button`, async ({ page, request }) => {
    await page.goto(path);
    const block = blogSignup(page);
    await expect(block).toBeVisible();

    // Directly between the two in the DOM, and in that order on screen.
    const neighbours = await block.evaluate((el) => [el.previousElementSibling?.querySelector("h2")?.textContent, el.nextElementSibling?.querySelector("h2")?.textContent]);
    expect(neighbours).toEqual(["Skip the blank page", "More from the blog"]);
    const cta = page.locator("aside", { has: page.getByRole("heading", { name: "Skip the blank page" }) });
    const related = page.getByRole("navigation", { name: "More from LaunchLoop" });
    const [ctaBox, blockBox, relatedBox] = await Promise.all([cta, block, related].map((l) => l.boundingBox()));
    expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(blockBox!.y);
    expect(blockBox!.y + blockBox!.height).toBeLessThanOrEqual(relatedBox!.y);
    // In the page flow: not a popup, slide-in or sticky bar.
    expect(await block.evaluate((el) => getComputedStyle(el).position)).toBe("static");

    await expect(block.getByRole("heading", { level: 2 })).toHaveText(COPY.heading);
    await expect(block.locator("p").first()).toHaveText(COPY.body);
    const field = block.getByLabel(COPY.label);
    await expect(field).toBeVisible();
    await expect(block.locator("label")).toHaveText(COPY.label);
    await expect(block.locator("label")).toHaveClass(/\bsr-only\b/);
    // No hint under the field.
    await expect(field).not.toHaveAttribute("aria-describedby");
    await hydrated(page);
    await expect(block.locator("form p")).toHaveCount(0);

    const button = block.getByRole("button", { name: COPY.button });
    await expect(button).toBeVisible();
    await expect(button).not.toHaveClass(/\bbg-primary\b/);
    await expect(button).toHaveClass(/\bborder-border\b/);
    await expect(block.locator(".bg-primary")).toHaveCount(0);

    const text = await block.innerText();
    expect(text).not.toMatch(/[\u2013\u2014]/);
    expect(text).not.toMatch(/£|\$|€|\d+\s*%|LAUNCH14|discount|price/i);

    // The existing calls to action are untouched.
    await expect(cta.getByRole("link", { name: "Get a free preview" })).toHaveClass(/\bbg-primary\b/);
    await expect(footer(page).getByRole("button", { name: "Subscribe" })).toHaveClass(/\bbg-primary\b/);
    await expect(footer(page).getByLabel("Weekly launch teardowns")).toBeVisible();

    // id="newsletter" exactly once, on this block, both as served and once hydrated; the footer's anchors don't clash.
    await expect(page.locator('[id="newsletter"]')).toHaveCount(1);
    await expect(page.locator('[id="newsletter"]')).toHaveAttribute("data-testid", "blog-newsletter");
    const html = await (await request.get(path)).text();
    const ids = [...html.matchAll(/\sid="(newsletter[^"]*)"/g)].map((m) => m[1]);
    expect(ids.filter((id) => id === "newsletter")).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["newsletter-blog-invalid", "newsletter-footer-invalid"]));
  });

  test(`${path}: signing up with JavaScript shows the existing success message in the block, and the footer stays idle`, async ({ page }) => {
    await page.goto(path);
    await hydrated(page);
    const block = blogSignup(page);
    const email = uniqueEmail("blog-news");
    await block.getByLabel(COPY.label).fill(email);
    await block.getByRole("button", { name: COPY.button }).click();

    const done = block.getByTestId("newsletter-done-blog");
    await expect(done).toHaveAttribute("data-welcome", "sent");
    await expect(done).toHaveAttribute("role", "status");
    await expect(done).toContainText("You're subscribed. One useful launch teardown a week, no spam.");
    await expect(done).toContainText("I've emailed you the link too.");
    await expect(done.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
    expect(new URL(page.url()).pathname).toBe(path);
    expect(new URL(page.url()).search).toBe("");
    await expectFooterIdle(page);
    await expectOneWelcomeEmail(page.request, email);
  });

  test(`${path}: a submit before hydration comes back to the post at #newsletter, and only the blog block reacts`, async ({ page }) => {
    await page.goto(path);
    const block = blogSignup(page);
    const email = uniqueEmail("blog-prehydration");
    await block.getByLabel(COPY.label).fill(email);
    // form.submit() skips React's onSubmit, exactly like a submit that lands before hydration (or without JavaScript).
    await block.getByRole("form", { name: "Newsletter signup" }).evaluate((form: HTMLFormElement) => form.submit());
    await page.waitForURL((u) => u.pathname === path);
    const url = new URL(page.url());
    expect(`${url.pathname}${url.search}${url.hash}`).toBe(`${path}?subscribed=1&from=blog#newsletter`);

    const done = block.getByTestId("newsletter-done-blog");
    await expect(done).toHaveAttribute("data-welcome", "sent");
    await expect(done).toContainText("You're subscribed");
    await expect(block).toBeInViewport();
    await expectFooterIdle(page);
    await expectOneWelcomeEmail(page.request, email);
  });
}

test("a redirected result only shows in the form it came from", async ({ page }) => {
  const path = postPath(BLOG_POSTS[0]);

  await page.goto(`${path}?subscribed=1&from=blog&welcome=existing#newsletter`);
  const done = blogSignup(page).getByRole("status");
  await expect(done).toHaveAttribute("data-welcome", "existing");
  await expect(done).toContainText("You're already on the list. Here's the launch-day checklist:");
  await expect(done).not.toContainText("emailed");
  await expectFooterIdle(page);

  await page.goto(`${path}?subscribed=0&error=rate&from=blog#newsletter-blog-rate`);
  await expect(blogSignup(page).getByRole("alert")).toHaveText("Too many attempts. Try again later.");
  await expectFooterIdle(page);

  // A footer result (no ?from=) leaves the blog block alone.
  await page.goto(`${path}?subscribed=1&welcome=skipped`);
  await expect(footer(page).getByRole("status")).toHaveAttribute("data-welcome", "skipped");
  await expect(blogSignup(page).getByRole("button", { name: COPY.button })).toBeVisible();
  await expect(blogSignup(page).getByRole("status")).toHaveCount(0);
});

test("/api/newsletter accepts placement 'blog' as JSON and as a form post", async ({ request }) => {
  const path = postPath(BLOG_POSTS[0]);
  const headers = () => ({ "x-forwarded-for": freshIp() });
  const email = uniqueEmail("blog-api");

  const json = await request.post("/api/newsletter", { data: { email, placement: "blog" }, headers: headers() });
  expect(json.status()).toBe(200);
  expect(await json.json()).toEqual({ ok: true, welcome: "sent" });
  await expectOneWelcomeEmail(request, email);

  const form = (fields: Record<string, string>) => request.post("/api/newsletter", { form: { placement: "blog", ...fields }, headers: headers(), maxRedirects: 0 });
  const again = await form({ email, next: path });
  expect(again.status()).toBe(303);
  expect(again.headers().location).toBe(`${path}?subscribed=1&welcome=existing&from=blog#newsletter`);

  const fresh = await form({ email: uniqueEmail("blog-api-form"), next: path });
  expect(fresh.headers().location).toBe(`${path}?subscribed=1&from=blog#newsletter`);
  expect((await form({ email: "not-an-email", next: path })).headers().location).toBe(`${path}?subscribed=0&error=invalid&from=blog#newsletter-blog-invalid`);
  expect((await form({ email: uniqueEmail("blog-api-evil"), next: "/.//evil.com" })).headers().location).toBe("/?subscribed=1&from=blog#newsletter");
  expect(await welcomeEmails(request, email)).toHaveLength(1);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const p of BLOG_POSTS) {
    const path = postPath(p);

    test(`${path}: the blog form posts and redirects back to the post's signup block`, async ({ page }) => {
      await page.goto(path);
      const block = blogSignup(page);
      const email = uniqueEmail("blog-nojs");
      await block.getByLabel(COPY.label).fill(email);
      await block.getByRole("button", { name: COPY.button }).click();
      await page.waitForURL((u) => u.pathname === path && u.searchParams.get("subscribed") === "1");
      const url = new URL(page.url());
      expect(`${url.pathname}${url.search}${url.hash}`).toBe(`${path}?subscribed=1&from=blog#newsletter`);
      expect(page.url()).not.toContain("example.com");
      expect(await page.evaluate(() => document.querySelector(":target")?.getAttribute("data-testid"))).toBe("blog-newsletter");
      await expect(footer(page).getByRole("button", { name: "Subscribe" })).toBeVisible();
      await expectOneWelcomeEmail(page.request, email);
    });
  }

  test("a rate-limited blog post shows its error in the blog block only", async ({ page }) => {
    const path = postPath(BLOG_POSTS[0]);
    const ip = freshIp();
    for (let i = 0; i < 10; i++) await page.request.post("/api/newsletter", { data: { email: "not-an-email" }, headers: { "x-forwarded-for": ip } });
    await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
    await page.goto(path);
    await blogSignup(page).getByLabel(COPY.label).fill(uniqueEmail("blog-nojs-limited"));
    await blogSignup(page).getByRole("button", { name: COPY.button }).click();
    await page.waitForURL((u) => u.searchParams.get("error") === "rate" && u.searchParams.get("from") === "blog");
    expect(new URL(page.url()).hash).toBe("#newsletter-blog-rate");
    await expect(blogSignup(page).getByText("Too many attempts. Try again later.")).toBeVisible();
    await expect(blogSignup(page).getByText("Couldn't subscribe you right now. Please try again.")).toBeHidden();
    await expect(footer(page).getByText("Too many attempts. Try again later.")).toBeHidden();
  });
});
