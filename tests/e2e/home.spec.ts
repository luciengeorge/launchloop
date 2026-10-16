import { expect, test } from "@playwright/test";
import { makeSampleKit } from "./helpers";

test("home page explains the product and offers the input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Paste your repo");
  await expect(page.getByLabel("GitHub repo or live site URL")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get my free preview" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Three steps. Pay only for what you need." })).toBeVisible();
  await expect(page.getByText("£19", { exact: true }).first()).toBeVisible();
});

test("header CTA is on every marketing page and Pricing links agree", async ({ page }) => {
  for (const path of ["/pricing", "/faq", "/login", "/privacy", "/terms", "/product-hunt-launch-checklist"]) {
    await page.goto(path);
    await expect(page.getByRole("banner").getByRole("link", { name: "Get my launch kit" })).toBeVisible();
  }
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
});

test("Ship Loop links carry a Soon badge instead of '(soon)' text", async ({ page, isMobile }) => {
  await page.goto("/");
  const regions = isMobile ? [page.getByRole("contentinfo")] : [page.getByRole("banner"), page.getByRole("contentinfo")];
  for (const region of regions) {
    const link = region.getByRole("link", { name: "Ship Loop (coming soon)", exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/ship-loop");
    await expect(link.getByText("Soon", { exact: true })).toBeVisible();
    await expect(region.getByText("(soon)")).toHaveCount(0);
  }
});

test("Get my launch kit always opens the start form, even after making a kit", async ({ page }) => {
  await makeSampleKit(page);
  await page.goto("/faq");
  await page.getByRole("banner").getByRole("link", { name: "Get my launch kit" }).click();
  await page.waitForURL((u) => u.pathname === "/" && u.search === "?plan=kit" && u.hash === "#start");
  await expect(page.getByLabel("GitHub repo or live site URL")).toBeFocused();
  await expect(page.locator("#start [data-plan]")).toHaveAttribute("data-plan", "kit");
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

test.describe("logged-out preview", () => {
  // Own preview rate-limit bucket, so this doesn't eat the budget the other specs share.
  test.use({ extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${Math.floor(Math.random() * 250) + 1}` } });

  test("free preview needs no account: a fresh visitor previews a live site and can share the link", async ({ page, browser }) => {
    expect(await page.context().cookies()).toEqual([]);
    const authRequests: string[] = [];
    const pages: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/auth")) authRequests.push(r.url());
    });
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) pages.push(new URL(f.url()).pathname);
    });

    await page.goto("/");
    await page.getByLabel("GitHub repo or live site URL").fill("http://127.0.0.1:3419/");
    await page.getByRole("button", { name: "Get my free preview" }).first().click();
    await page.waitForURL(/\/kit\/[\w-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pagebird");
    await page.getByTestId("stage-tab-Product Hunt").click();
    await expect(page.locator('[data-task-id="ph.tagline"]')).toHaveAttribute("data-locked", "false");
    await expect(page.getByTestId("preview-paywall")).toBeVisible();
    // An account only comes in at unlock.
    await expect(page.getByRole("button", { name: "Unlock the full kit, £19" })).toBeVisible();
    expect(authRequests).toEqual([]);
    expect(pages.some((p) => p.startsWith("/login") || p.startsWith("/account"))).toBe(false);

    const other = await browser.newContext();
    const friend = await other.newPage();
    await friend.goto(page.url());
    await expect(friend.getByRole("heading", { level: 1 })).toHaveText("Pagebird");
    await expect(friend.getByTestId("preview-paywall")).toBeVisible();
    await other.close();
  });
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
