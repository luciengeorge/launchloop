import { expect, test } from "@playwright/test";
import { makeSampleKit, uniqueEmail } from "./helpers";

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
  expect(buttonBox!.height).toBeGreaterThanOrEqual(32);

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
