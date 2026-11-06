import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { makeSampleKit, uniqueEmail } from "./helpers";

// Runs against the build with NEWSLETTER_CALENDAR=on and NEWSLETTER_INLINE=on (the calendar-desktop project), as on
// Preview and at go-live. newsletter-calendar-off.spec.ts covers the flag off.
const FIXTURE = "http://127.0.0.1:3419";
const freshIp = () => `203.3.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
test.beforeEach(async ({ context }) => context.setExtraHTTPHeaders({ "x-forwarded-for": freshIp() }));

const CALENDAR = "/7-day-launch-calendar";
const CHECKLIST = "/product-hunt-launch-checklist";
const DASHES = /[\u2012-\u2015]/;
const COPY = {
  label: "Email for the 7-day launch calendar",
  button: "Send me the calendar",
  homeBody: "I'll email you my 7-day launch calendar now, then one launch teardown a week. Short, practical, easy to unsubscribe.",
  postTitle: "Get my 7-day launch calendar",
  footerHint: "I'll send you my 7-day launch calendar straight away, then one launch teardown a week.",
};

type Mail = { to: string; subject: string; text: string };
type PhEvent = { event: string; distinct_id?: string; properties: Record<string, unknown> };
const phEvents = async (request: APIRequestContext) => (await (await request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];
const hydrated = (page: Page) => expect(page.locator('p[id^="newsletter-"]')).toHaveCount(0);
const robots = (page: Page) => page.locator('meta[name="robots"]').getAttribute("content");

async function welcomeEmail(request: APIRequestContext, email: string): Promise<Mail> {
  let mail: Mail | undefined;
  await expect
    .poll(async () => {
      const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: Mail[] };
      return (mail = emails.find((e) => e.to === email));
    })
    .toBeTruthy();
  return mail!;
}

/** The success state names and links the calendar, with the checklist as a quieter second link. */
async function expectCalendarSuccess(scope: Locator) {
  const done = scope.getByRole("status");
  await expect(done).toHaveAttribute("data-welcome", "sent");
  await expect(done).toContainText("You're subscribed");
  await expect(done).toContainText("I've emailed you the link too.");
  await expect(done.getByRole("link", { name: "Open your 7-day launch calendar" })).toHaveAttribute("href", CALENDAR);
  await expect(done.getByTestId("newsletter-done-checklist")).toHaveText("Prefer the Product Hunt checklist? Open it here.");
  await expect(done.getByRole("link", { name: "Open it here" })).toHaveAttribute("href", CHECKLIST);
  expect(await done.innerText()).not.toMatch(DASHES);
}

test("every signup names the calendar: the home band, a post's inline block, the kit preview card and the footer", async ({ page }) => {
  await page.goto("/");
  const band = page.getByTestId("inline-newsletter-home");
  await expect(band.getByRole("heading", { level: 2 })).toHaveText("Not launching this week?");
  await expect(band.locator("p").first()).toHaveText(COPY.homeBody);
  await expect(band.getByRole("button", { name: COPY.button })).toBeVisible();
  await expect(band.getByLabel(COPY.label)).toBeAttached();

  await page.goto("/blog/how-to-launch-on-betalist");
  const post = page.getByTestId("inline-newsletter-post");
  await expect(post.locator("#inline-newsletter-heading")).toHaveText(COPY.postTitle);
  await expect(post.getByRole("button", { name: COPY.button })).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByRole("contentinfo")).toContainText(COPY.footerHint);

  await makeSampleKit(page);
  const card = page.getByTestId("preview-newsletter");
  await expect(card.locator("p").first()).toHaveText(COPY.homeBody);
  await expect(card.getByRole("button", { name: COPY.button })).toBeVisible();
  expect(await card.innerText()).not.toMatch(DASHES);
});

test("home_inline signup: the success state links the calendar, and the one welcome email is the calendar email", async ({ page }) => {
  await page.goto("/");
  await hydrated(page);
  const band = page.getByTestId("inline-newsletter-home");
  const email = uniqueEmail("calendar-home");
  await band.getByLabel(COPY.label).fill(email);
  await band.getByRole("button", { name: COPY.button }).click();
  await expectCalendarSuccess(band);
  // Focus moves to the calendar link, the first one, when the form goes away.
  await expect(band.getByRole("link", { name: "Open your 7-day launch calendar" })).toBeFocused();

  const mail = await welcomeEmail(page.request, email);
  expect(mail.subject).toBe("Your 7-day launch calendar");
  expect(mail.text).toContain(`Open the 7-day launch calendar ${new URL(page.url()).origin}${CALENDAR}?utm_source=newsletter&utm_medium=email&utm_campaign=welcome`);
  expect(mail.text).toContain(`${CHECKLIST}?utm_source=newsletter&utm_medium=email&utm_campaign=welcome&utm_content=ph-checklist`);
  expect(mail.text).not.toMatch(DASHES);

  // The same address again: no second email, and the copy points at the calendar without claiming one was sent.
  await page.reload();
  await hydrated(page);
  await band.getByLabel(COPY.label).fill(email.toUpperCase());
  await band.getByRole("button", { name: COPY.button }).click();
  const done = band.getByRole("status");
  await expect(done).toHaveAttribute("data-welcome", "existing");
  await expect(done).toContainText("You're already on the list. Here's the 7-day launch calendar:");
  await expect(done).not.toContainText("emailed");
  await expect(done.getByRole("link", { name: "Open the calendar" })).toHaveAttribute("href", CALENDAR);
  const sentinel = uniqueEmail("calendar-home-sentinel");
  await page.request.post("/api/newsletter", { data: { email: sentinel, placement: "footer" }, headers: { "x-forwarded-for": freshIp() } });
  await welcomeEmail(page.request, sentinel);
  const { emails } = (await (await page.request.get("/api/dev/outbox")).json()) as { emails: Mail[] };
  expect(emails.filter((e) => e.to === email)).toHaveLength(1);
});

test("the welcome-cap skip says so and still links the calendar", async ({ page }) => {
  await page.goto("/pricing?subscribed=1&welcome=skipped");
  const done = page.getByRole("contentinfo").getByRole("status");
  await expect(done).toHaveAttribute("data-welcome", "skipped");
  await expect(done).toContainText("Here's the 7-day launch calendar:");
  await expect(done).not.toContainText("emailed");
  await expect(done.getByRole("link", { name: "Open the calendar" })).toHaveAttribute("href", CALENDAR);
});

test("a QA signup on /?qa=1 with a Resend test address gets the calendar welcome and is is_test", async ({ page }) => {
  const email = `delivered+calendar-${Date.now()}@resend.dev`;
  await page.goto("/?qa=1");
  await hydrated(page);
  const band = page.getByTestId("inline-newsletter-home");
  const request = page.waitForRequest((r) => r.url().endsWith("/api/newsletter") && r.method() === "POST");
  await band.getByLabel(COPY.label).fill(email);
  await band.getByRole("button", { name: COPY.button }).click();
  const response = await (await request).response();
  expect(await response!.json()).toEqual({ ok: true, welcome: "sent" });
  await expectCalendarSuccess(band);
  expect((await welcomeEmail(page.request, email)).subject).toBe("Your 7-day launch calendar");
  const { analyticsId } = (await request).postDataJSON() as { analyticsId: string };
  let event: PhEvent | undefined;
  await expect.poll(async () => (event = (await phEvents(page.request)).find((e) => e.event === "newsletter_subscribed" && e.distinct_id === analyticsId))).toBeTruthy();
  expect(event!.properties).toMatchObject({ placement: "home_inline", welcome: "sent", is_test: true });
});

test("/7-day-launch-calendar is indexable, in the sitemap and on /guides, with all seven days", async ({ page, request }) => {
  await page.goto(CALENDAR);
  expect(await robots(page)).toBe("index, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/7-day-launch-calendar$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The 7-day launch calendar");
  for (let day = 1; day <= 7; day++) await expect(page.getByRole("heading", { level: 2, name: new RegExp(`^Day ${day}: `) })).toBeVisible();
  const box = page.getByRole("checkbox", { name: "Pick the Product Hunt day." });
  await box.check();
  await expect(box).toBeChecked();
  expect(await page.locator("article").innerText()).not.toMatch(DASHES);
  expect(await page.locator("article").innerText()).not.toMatch(/exclusive|subscribers only/i);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of [CALENDAR, "/newsletter", "/newsletter/1"]) expect(sitemap).toMatch(new RegExp(`<loc>[^<]*${path}</loc>`));

  await page.goto("/guides");
  await expect(page.getByRole("main").getByRole("link", { name: "The 7-day launch calendar" })).toHaveAttribute("href", CALENDAR);
});

test("/newsletter and /newsletter/1 are indexable with share cards, and the issue is the locked text", async ({ page, request }) => {
  await page.goto("/newsletter");
  expect(await robots(page)).toBe("index, follow");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Weekly launch teardowns");
  await expect(page.getByTestId("newsletter-archive-signup").getByRole("button", { name: COPY.button })).toBeVisible();
  await page.getByRole("link", { name: "Before you submit to BetaList, check these 5 things" }).click();
  await page.waitForURL((u) => u.pathname === "/newsletter/1");

  expect(await robots(page)).toBe("index, follow");
  await expect(page).toHaveTitle("Before you submit to BetaList: 5 checks · LaunchLoop");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Before you submit to BetaList, check these 5 things");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Before you submit to BetaList: 5 checks · LaunchLoop");
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    "What BetaList's own pages say about getting listed, what makers got from it, and the image size for your share card.",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(image).toMatch(/\/og\/newsletter-1$/);
  const png = await request.get(new URL(image!).pathname);
  expect(png.status()).toBe(200);
  expect(png.headers()["content-type"]).toContain("image/png");

  await expect(page.getByTestId("byline")).toHaveText("Sample issue · Lucien · 27 October 2026");
  const body = page.getByTestId("newsletter-issue-body");
  await expect(body.locator("p").first()).toHaveText("Hey, Lucien here.");
  await expect(body.locator("p").last()).toHaveText("Lucien");
  await expect(body.getByRole("link", { name: "Submission Terms" })).toHaveAttribute("href", "https://betalist.com/terms/submissions");
  await expect(page.locator("body")).not.toContainText(/DRAFT|HELD|not sent/);
  expect(await page.locator("article").innerText()).not.toMatch(DASHES);
});

test("archive signup: placement newsletter, the footer links up to it, and a no-JS post comes back to the issue", async ({ page }) => {
  await page.goto("/newsletter/1");
  const signup = page.getByTestId("newsletter-archive-signup");
  await expect(signup).toHaveAttribute("id", "newsletter");
  await expect(page.locator('[id="newsletter"]')).toHaveCount(1);
  await expect(page.getByRole("contentinfo").getByTestId("footer-newsletter-link")).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" })).toBeHidden();
  await expect(signup.getByRole("form")).toHaveAttribute("data-placement", "newsletter");

  // form.submit() skips React's onSubmit, exactly like a submit that lands before hydration.
  await signup.getByLabel(COPY.label).fill(uniqueEmail("archive-nojs"));
  await signup.getByRole("form").evaluate((form: HTMLFormElement) => form.submit());
  await page.waitForURL((u) => u.pathname === "/newsletter/1" && u.searchParams.get("subscribed") === "1" && u.searchParams.get("from") === "newsletter" && u.hash === "#newsletter");
  await expectCalendarSuccess(signup);
  await expect
    .poll(async () => (await phEvents(page.request)).some((e) => e.event === "newsletter_subscribed" && e.properties.placement === "newsletter" && e.properties.submitted === "form"))
    .toBe(true);
});

test.describe("newsletter_form_viewed on the archive", () => {
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

  test("fires once for placement newsletter, with the sample link's UTMs", async ({ page }) => {
    const campaign = `newsletter-sample-${Date.now()}`;
    await page.goto(`/newsletter/1?utm_source=x&utm_medium=reply&utm_campaign=${campaign}`);
    await page.getByTestId("newsletter-archive-signup").scrollIntoViewIfNeeded();
    const viewed = async () => (await phEvents(page.request)).filter((e) => e.event === "newsletter_form_viewed" && e.properties.utm_campaign === campaign);
    await expect.poll(async () => (await viewed()).filter((e) => e.properties.placement === "newsletter").length).toBe(1);
    expect((await viewed()).find((e) => e.properties.placement === "newsletter")!.properties).toMatchObject({ path: "/newsletter/1", utm_source: "x", utm_medium: "reply" });
  });
});
