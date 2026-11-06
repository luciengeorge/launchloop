import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { uniqueEmail } from "./helpers";

// The default build: newsletter-calendar-reward off (no flag, as in production until Lucien's OK) and inline signups off.
// newsletter-calendar.spec.ts covers the flag on.
const freshIp = () => `203.2.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
test.beforeEach(async ({ context }) => context.setExtraHTTPHeaders({ "x-forwarded-for": freshIp() }));

const CALENDAR = "/7-day-launch-calendar";
const CHECKLIST = "/product-hunt-launch-checklist";
const REWARD_PAGES = [CALENDAR, "/newsletter", "/newsletter/1"];
const DASHES = /[\u2012-\u2015]/;

const robots = (page: Page) => page.locator('meta[name="robots"]').getAttribute("content");
const sitemapPaths = async (request: APIRequestContext) =>
  [...(await (await request.get("/sitemap.xml")).text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

test("the calendar and the archive answer 200 for QA, but are noindex, follow and out of the sitemap", async ({ page, request }) => {
  for (const path of REWARD_PAGES) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    expect(await robots(page), path).toBe("noindex, follow");
  }
  const listed = await sitemapPaths(request);
  expect(listed).toContain("/guides");
  for (const path of REWARD_PAGES) expect(listed, path).not.toContain(path);
  // robots.txt is unchanged: nothing disallowed, so social crawlers still read the share cards.
  expect(await (await request.get("/robots.txt")).text()).not.toMatch(/newsletter|calendar/);
});

test("nothing links to them: not /guides, the footer, the blog, a guide's More guides or llms.txt", async ({ page, request }) => {
  for (const path of ["/", "/guides", "/blog", "/blog/how-to-launch-on-betalist", CHECKLIST, "/tools"]) {
    await page.goto(path);
    await expect(page.locator(`a[href^="${CALENDAR}"], a[href^="/newsletter"]`), path).toHaveCount(0);
  }
  expect(await (await request.get("/llms.txt")).text()).not.toMatch(/7-day-launch-calendar|\/newsletter/);
});

test("the forms still offer the checklist, and a signup still gets the checklist", async ({ page, request }) => {
  await page.goto("/pricing");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("I'll send you my launch-day checklist straight away, then one launch teardown a week.");
  await expect(footer).not.toContainText("calendar");
  await page.goto("/blog/og-image-size");
  await expect(page.getByTestId("blog-newsletter")).toContainText("Get my launch-day checklist");
  await expect(page.getByTestId("blog-newsletter").getByRole("button", { name: "Send me the checklist" })).toBeVisible();

  await page.goto("/pricing");
  const email = uniqueEmail("calendar-off");
  await footer.getByLabel("Weekly launch teardowns").fill(email);
  await footer.getByRole("button", { name: "Subscribe" }).click();
  const done = footer.getByRole("status");
  await expect(done).toHaveAttribute("data-welcome", "sent");
  await expect(done.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
  await expect(done).not.toContainText("calendar");
  await expect(done.getByTestId("newsletter-done-checklist")).toHaveCount(0);

  let mail: { to: string; subject: string; text: string } | undefined;
  await expect
    .poll(async () => {
      const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string; text: string }[] };
      return (mail = emails.find((e) => e.to === email));
    })
    .toBeTruthy();
  expect(mail!.subject).toBe("Your launch-day checklist");
  expect(mail!.text).not.toMatch(/calendar/i);
});

test("the archive still works while off: the locked issue, and a signup recorded as placement newsletter with the checklist", async ({ page }) => {
  await page.goto("/newsletter/1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Before you submit to BetaList, check these 5 things");
  const body = page.getByTestId("newsletter-issue-body");
  await expect(body).toContainText("Hey, Lucien here.");
  await expect(body).toContainText("1. It's paid now.");
  await expect(page.locator("body")).not.toContainText(/DRAFT|HELD|not sent/);
  const signup = page.getByTestId("newsletter-archive-signup");
  await expect(signup).toContainText("This is a sample issue. Sign up below and I'll email you the next one.");
  await expect(signup).toContainText("launch-day checklist");
  await expect(page.locator('p[id^="newsletter-"]')).toHaveCount(0);

  const request = page.waitForRequest((r) => r.url().endsWith("/api/newsletter") && r.method() === "POST");
  await signup.getByLabel("Email for the launch-day checklist").fill(uniqueEmail("archive-off"));
  await signup.getByRole("button", { name: "Send me the checklist" }).click();
  expect(((await request).postDataJSON() as { placement: string }).placement).toBe("newsletter");
  await expect(signup.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
  expect(await page.locator("main").innerText()).not.toMatch(DASHES);
});
