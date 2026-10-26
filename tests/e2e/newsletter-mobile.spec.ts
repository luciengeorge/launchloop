import { expect, test, type Locator, type Page } from "@playwright/test";
import { makeSampleKit, uniqueEmail } from "./helpers";

/** At 375px every newsletter form stacks: a full-width field over the button, both 44px tall, the field's text 16px. */
async function expectStacked(page: Page, form: Locator, label: string, button: string) {
  const field = form.getByLabel(label);
  await field.scrollIntoViewIfNeeded();
  const [fieldBox, buttonBox] = await Promise.all([field.boundingBox(), form.getByRole("button", { name: button }).boundingBox()]);
  expect(fieldBox!.height).toBeGreaterThanOrEqual(44);
  expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
  expect(buttonBox!.y).toBeGreaterThanOrEqual(fieldBox!.y + fieldBox!.height);
  expect(fieldBox!.width).toBeGreaterThanOrEqual(300);
  expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
}

test.describe("at 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("the footer form on / stacks, with 44px targets and 16px text", async ({ page }) => {
    await page.goto("/");
    await expectStacked(page, page.getByRole("contentinfo"), "Weekly launch teardowns", "Subscribe");
  });

  test("the post-preview form stacks", async ({ page }) => {
    await makeSampleKit(page);
    await expectStacked(page, page.getByTestId("preview-newsletter"), "Email for the launch-day checklist", "Send me the checklist");
  });

  test("a blog post's form stacks", async ({ page }) => {
    await page.goto("/blog/how-to-launch-on-product-hunt");
    await expectStacked(page, page.getByTestId("blog-newsletter"), "Email for the launch-day checklist", "Send me the checklist");
  });
});

// Runs in the mobile project (Pixel 7); the desktop project covers the same card in newsletter.spec.ts.
test.skip(({ isMobile }) => !isMobile, "mobile viewport only");
test.use({ extraHTTPHeaders: { "x-forwarded-for": `198.18.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}` } });

test("post-preview signup on mobile: stacked under the paywall, outline button, and a success state with the checklist", async ({ page }) => {
  await makeSampleKit(page);
  const viewport = page.viewportSize()!;
  const signup = page.getByTestId("preview-newsletter");
  await signup.scrollIntoViewIfNeeded();
  await expect(signup.getByRole("heading", { name: "Not launching this week?" })).toBeVisible();

  // Under the paywall, above the locked kit, and inside the screen width.
  const [paywall, card, locked] = await Promise.all(["preview-paywall", "preview-newsletter", "locked-kit"].map((id) => page.getByTestId(id).boundingBox()));
  expect(paywall!.y + paywall!.height).toBeLessThanOrEqual(card!.y);
  expect(card!.y + card!.height).toBeLessThanOrEqual(locked!.y);
  expect(card!.x).toBeGreaterThanOrEqual(0);
  expect(card!.x + card!.width).toBeLessThanOrEqual(viewport.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

  // Stacked: the copy, then the field and button, each fully on screen.
  const copy = await signup.getByRole("heading", { name: "Not launching this week?" }).boundingBox();
  const field = signup.getByLabel("Email for the launch-day checklist");
  const button = signup.getByRole("button", { name: "Send me the checklist" });
  const [fieldBox, buttonBox] = await Promise.all([field.boundingBox(), button.boundingBox()]);
  expect(fieldBox!.y).toBeGreaterThan(copy!.y + copy!.height);
  expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
  expect(fieldBox!.height).toBeGreaterThanOrEqual(44);
  // 16px or more, or iOS zooms the page in when the field takes focus.
  expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  // Outline, so the £19 unlock button stays the only primary one (the footer steps down too).
  await expect(button).not.toHaveClass(/\bbg-primary\b/);
  await expect(page.getByRole("button", { name: "Unlock the full kit, £19" })).toHaveClass(/\bbg-primary\b/);
  await expect(page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" })).not.toHaveClass(/\bbg-primary\b/);
  await expect(page.locator('[data-slot="button"].bg-primary:visible')).toHaveCount(1);

  await field.fill(uniqueEmail("mobile-preview"));
  await button.tap();
  const done = signup.getByRole("status");
  await expect(done).toHaveAttribute("data-welcome", "sent");
  await expect(done).toContainText("You're subscribed");
  await expect(done).toContainText("I've emailed you the link too.");
  const link = done.getByRole("link", { name: "Open your launch-day checklist" });
  await expect(link).toBeInViewport();
  const linkBox = await link.boundingBox();
  expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(viewport.width);
  await link.tap();
  await page.waitForURL((u) => u.pathname === "/product-hunt-launch-checklist");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Product Hunt launch checklist");
});
