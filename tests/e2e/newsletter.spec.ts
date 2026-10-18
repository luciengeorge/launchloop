import { expect, test, type APIRequestContext } from "@playwright/test";
import { makeSampleKit, uniqueEmail } from "./helpers";

// Own newsletter and preview rate-limit buckets, so these signups don't eat the budget the other specs share.
test.use({ extraHTTPHeaders: { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}` } });

const CHECKLIST = "/product-hunt-launch-checklist";

async function welcomeEmails(request: APIRequestContext, email: string) {
  const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string; text: string }[] };
  return emails.filter((e) => e.to === email && e.subject === "Your launch-day checklist");
}

async function welcomeEmail(request: APIRequestContext, email: string) {
  await expect.poll(async () => (await welcomeEmails(request, email)).length).toBe(1);
  return (await welcomeEmails(request, email))[0];
}

test("after the free preview: a quiet signup under the paywall, with the £19 kit CTA still primary", async ({ page }) => {
  await makeSampleKit(page);
  const signup = page.getByTestId("preview-newsletter");
  await expect(signup.getByRole("heading", { name: "Not launching this week?" })).toBeVisible();
  await expect(signup).toContainText("launch-day checklist");

  // Paywall first, then the signup, then the locked kit.
  const tops = await page.evaluate(() =>
    ["preview-paywall", "preview-newsletter", "locked-kit"].map((id) => document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect().top),
  );
  expect(tops[0]).toBeLessThan(tops[1]);
  expect(tops[1]).toBeLessThan(tops[2]);

  const unlock = page.getByRole("button", { name: "Unlock the full kit, £19" });
  const subscribe = signup.getByRole("button", { name: "Send me the checklist" });
  await expect(unlock).toHaveClass(/\bbg-primary\b/);
  await expect(subscribe).not.toHaveClass(/\bbg-primary\b/);
  await expect(page.getByRole("button", { name: /£19/ })).toHaveCount(1);

  const email = uniqueEmail("preview-news");
  await signup.getByLabel("Email for the launch-day checklist").fill(email);
  await subscribe.click();
  const done = signup.getByRole("status");
  await expect(done).toContainText("You're subscribed");
  await expect(done.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
  // The kit CTA is untouched by subscribing.
  await expect(unlock).toBeVisible();

  const mail = await welcomeEmail(page.request, email);
  expect(mail.text).toContain(`${CHECKLIST}?utm_source=newsletter&utm_medium=email&utm_campaign=welcome`);
  expect(mail.text).not.toMatch(/[\u2013\u2014]/);

  await done.getByRole("link", { name: "Open your launch-day checklist" }).click();
  await page.waitForURL((u) => u.pathname === CHECKLIST);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Product Hunt launch checklist");
});

test("not shown on the way to checkout (?unlock=1)", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  await expect(page.getByTestId("preview-newsletter")).toBeVisible();
  await page.goto(`/kit/${kitId}?unlock=1`);
  await expect(page.getByTestId("unlock-panel")).toBeVisible();
  await expect(page.getByTestId("preview-newsletter")).toHaveCount(0);
});

test("footer signup offers the checklist, and signing up again doesn't resend it", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("launch-day checklist");

  const email = uniqueEmail("footer-news");
  await footer.getByLabel("Weekly launch teardowns").fill(email);
  await footer.getByRole("button", { name: "Subscribe" }).click();
  const done = footer.getByRole("status");
  await expect(done).toContainText("You're subscribed");
  await expect(done.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
  await welcomeEmail(page.request, email);

  // Same address again (any placement, any case) is still a success but sends nothing new.
  const again = await page.request.post("/api/newsletter", { data: { email: email.toUpperCase(), placement: "preview" } });
  expect(again.ok()).toBe(true);
  // A fresh signup after it: once its email lands, the repeat's would have too.
  const sentinel = uniqueEmail("footer-news-sentinel");
  expect((await page.request.post("/api/newsletter", { data: { email: sentinel } })).ok()).toBe(true);
  await welcomeEmail(page.request, sentinel);
  expect(await welcomeEmails(page.request, email)).toHaveLength(1);
});

test.describe("plain form posts", () => {
  // The kit page itself needs JavaScript, but a submit before hydration is still a plain form post.
  test("post-preview signup submitted before hydration comes back to the kit with the checklist link", async ({ page }) => {
    const kitId = await makeSampleKit(page);
    const signup = page.getByTestId("preview-newsletter");
    const email = uniqueEmail("prehydration-preview");
    await signup.getByLabel("Email for the launch-day checklist").fill(email);
    // form.submit() skips React's onSubmit, exactly like a submit that lands before hydration.
    await signup.getByRole("form", { name: "Newsletter signup" }).evaluate((form: HTMLFormElement) => form.submit());
    await page.waitForURL((u) => u.pathname === `/kit/${kitId}` && u.searchParams.get("subscribed") === "1" && u.searchParams.get("from") === "preview" && u.hash === "#newsletter");
    expect(page.url()).not.toContain("example.com");
    await expect(signup.getByRole("status")).toContainText("You're subscribed");
    await expect(signup.getByRole("link", { name: "Open your launch-day checklist" })).toHaveAttribute("href", CHECKLIST);
    // The footer form on the same page isn't the one that was used, so it stays a form.
    await expect(page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" })).toBeVisible();
    await welcomeEmail(page.request, email);
  });

  test("the API sends no-JS posts back to a same-origin path only", async ({ request }) => {
    const post = (next: string) =>
      request.post("/api/newsletter", { form: { email: uniqueEmail("nojs-next"), placement: "preview", next }, maxRedirects: 0 });
    expect((await post("/kit/abc")).headers().location).toBe("/kit/abc?subscribed=1&from=preview#newsletter");
    expect((await post("//evil.example")).headers().location).toBe("/?subscribed=1&from=preview#newsletter");
    expect((await post("https://evil.example/kit/abc")).headers().location).toBe("/?subscribed=1&from=preview#newsletter");
    const footer = await request.post("/api/newsletter", { form: { email: uniqueEmail("nojs-footer") }, maxRedirects: 0 });
    expect(footer.status()).toBe(303);
    expect(footer.headers().location).toBe("/?subscribed=1");
  });
});
