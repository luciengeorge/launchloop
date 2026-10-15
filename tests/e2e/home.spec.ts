import { expect, test } from "@playwright/test";

test("home page explains the product and offers the input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Paste your repo");
  await expect(page.getByLabel("GitHub repo or live site URL")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get my free preview" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Simple pricing" })).toBeVisible();
  await expect(page.getByText("£19", { exact: true }).first()).toBeVisible();
});

test("header CTA is on every marketing page and Pricing links agree", async ({ page }) => {
  for (const path of ["/pricing", "/faq", "/login", "/privacy", "/terms", "/product-hunt-launch-checklist"]) {
    await page.goto(path);
    await expect(page.getByRole("banner").getByRole("link", { name: "Get my launch kit" })).toBeVisible();
  }
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
});

test("invalid input shows a friendly error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("GitHub repo or live site URL").fill("not a url");
  await page.getByRole("button", { name: "Get my free preview" }).first().click();
  await expect(page.getByTestId("kit-error")).toContainText("Paste something like github.com/you/your-app");
});

test("newsletter signup succeeds", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Weekly launch teardowns").fill(`news-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByRole("status").filter({ hasText: "You're subscribed" })).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("newsletter form posts instead of leaking the email into the URL", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Weekly launch teardowns").fill(`nojs-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Subscribe" }).click();
    await page.waitForURL(/subscribed=1/);
    expect(page.url()).not.toContain("example.com");
  });
});
