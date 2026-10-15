import { expect, test } from "@playwright/test";

test("home has title, description and Open Graph tags", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/LaunchLoop/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /launch/i);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /LaunchLoop/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /opengraph-image/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test("robots, sitemap and llms.txt", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap:");
  expect(robots).toContain("Disallow: /kit/");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/faq");
  expect(sitemap).toContain("/ship-loop");

  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/plain");
  const text = await llms.text();
  expect(text).toMatch(/^# LaunchLoop/);
  expect(text).toContain("£19");
});

test("FAQ page ships FAQPage JSON-LD", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frequently asked questions");
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(jsonLd["@type"]).toBe("FAQPage");
  expect(jsonLd.mainEntity.length).toBeGreaterThan(5);
});

test("site OG image renders", async ({ request }) => {
  const res = await request.get("/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});
