import { expect, test } from "@playwright/test";

const PATH = "/tools/product-hunt-tagline-checker";

test("tagline checker has its own title, meta, canonical, share image and JSON-LD", async ({ page, request }) => {
  await page.goto(PATH);
  await expect(page).toHaveTitle("Product Hunt Tagline Checker (60 chars) · LaunchLoop");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Product Hunt tagline checker");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /60-character.*GitHub repo.*kit/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${PATH}$`));
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new RegExp(`${PATH}$`));
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", new RegExp(`${PATH}/opengraph-image`));
  await expect(page.locator('meta[name="twitter:image"]').first()).toHaveAttribute("content", new RegExp(`${PATH}/opengraph-image`));

  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const nodes = graph["@graph"] as { "@type": string; mainEntity?: unknown[] }[];
  expect(nodes.map((n) => n["@type"])).toEqual(expect.arrayContaining(["WebApplication", "FAQPage", "BreadcrumbList"]));
  expect(nodes.find((n) => n["@type"] === "FAQPage")?.mainEntity).toHaveLength(5);

  const image = await request.get(`${PATH}/opengraph-image`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(PATH);

  await expect(page.locator(`main a[href="/#start"]`).first()).toBeVisible();
  await expect(page.locator(`main a[href="/pricing"]`).first()).toBeVisible();
  await expect(page.locator(`main a[href="/product-hunt-launch-checklist"]`)).toBeVisible();
  const body = (await page.locator("main").innerText()).toLowerCase();
  expect(body).not.toMatch(/\bupvot|\bvotes?\b/);
});

test("short alias redirects to the tools URL", async ({ request }) => {
  const res = await request.get("/product-hunt-tagline-checker", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toMatch(new RegExp(`${PATH}$`));
});

test("checker is reachable from the footer, home hero, header and both guides", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Free tools and guides" }).locator(`a[href="${PATH}"]`)).toBeVisible();
  await expect(page.locator("#start").getByRole("link", { name: "Try the free tagline checker" })).toBeVisible();
  if (!isMobile) await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tagline checker" })).toBeVisible();
  for (const path of ["/product-hunt-launch-checklist", "/how-to-launch-a-vibe-coded-app"]) {
    await page.goto(path);
    await expect(page.locator("article").locator(`a[href="${PATH}"]`).first()).toBeVisible();
  }
});

test("tabs stay on one line and the name sits above the tagline", async ({ page }) => {
  await page.goto(PATH);
  for (const name of ["Check a tagline", "Generate from repo or URL"]) {
    const box = (await page.getByRole("tab", { name }).boundingBox())!;
    expect(box.height).toBeLessThan(40);
  }
  const nameBox = (await page.getByLabel("Product name").boundingBox())!;
  const taglineBox = (await page.getByLabel("Tagline", { exact: true }).boundingBox())!;
  expect(nameBox.y + nameBox.height).toBeLessThanOrEqual(taglineBox.y);
  expect(Math.abs(nameBox.width - taglineBox.width)).toBeLessThan(2);
  const countBox = (await page.getByTestId("tagline-count").boundingBox())!;
  expect(countBox.height).toBeLessThan(28);
});

test("check mode: live counter, flags, feed preview and CTA", async ({ page }) => {
  await page.goto(PATH);
  const tagline = page.getByLabel("Tagline", { exact: true });
  const count = page.getByTestId("tagline-count");

  await tagline.fill("Turn your GitHub repo into a launch kit");
  await expect(count).toHaveText("39 / 60");
  await expect(count).toHaveAttribute("data-within", "true");
  await expect(page.getByTestId("tagline-verdict")).toHaveAttribute("data-verdict", "pass");
  await expect(page.getByTestId("tagline-cta")).toContainText("Your tagline is ready.");
  await expect(page.getByTestId("tagline-cta-start")).toHaveAttribute("href", "/#start");

  await tagline.fill("x".repeat(61));
  await expect(count).toHaveText("61 / 60");
  await expect(count).toHaveAttribute("data-within", "false");
  await expect(page.getByTestId("tagline-verdict")).toHaveAttribute("data-verdict", "fail");
  await expect(page.locator('[data-check="length"]')).toHaveAttribute("data-status", "fail");

  await page.getByLabel("Product name").fill("Snapshelf");
  await tagline.fill("SNAPSHELF IS THE ULTIMATE AI-POWERED TOOL 🚀.");
  for (const id of ["period", "caps", "emoji", "hype", "name"]) {
    await expect(page.locator(`[data-check="${id}"]`)).toHaveAttribute("data-status", "warn");
  }
  await expect(page.getByTestId("tagline-verdict")).toHaveAttribute("data-verdict", "warn");
  const preview = page.getByTestId("tagline-preview");
  await expect(preview).toContainText("Snapshelf");
  await expect(preview).toContainText("SNAPSHELF IS THE ULTIMATE AI-POWERED TOOL");
});

test("generate mode: three options from the free-preview pipeline, one click into check mode, deep link to the preview", async ({ page }) => {
  await page.goto(PATH);
  await page.getByRole("tab", { name: "Generate from repo or URL" }).click();
  await page.getByRole("button", { name: "Try a sample app" }).click();

  const options = page.getByTestId("tagline-options").getByRole("listitem");
  await expect(options).toHaveCount(3);
  const counts = page.getByTestId("tagline-options").getByTestId("tagline-count");
  for (let i = 0; i < 3; i++) await expect(counts.nth(i)).toHaveAttribute("data-within", "true");
  await expect(page.getByTestId("tagline-cta-start")).toHaveAttribute("href", "/?url=sample#start");

  const first = (await options.first().locator("p").innerText()).trim();
  await options.first().getByRole("button", { name: /^Check/ }).click();
  await expect(page.getByRole("tab", { name: "Check a tagline" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Tagline", { exact: true })).toHaveValue(first);
  await expect(page.getByLabel("Product name")).toHaveValue("Snapshelf");
  await expect(page.locator('[data-check="name"]')).toHaveAttribute("data-status", "pass");
  await expect(page.locator('[data-check="length"]')).toHaveAttribute("data-status", "pass");

  await page.getByTestId("tagline-cta-start").click();
  await page.waitForURL(/\/\?url=sample#start$/);
  await expect(page.getByLabel("GitHub repo or live site URL")).toHaveValue("sample");
});

test("generate mode shows friendly ingest errors", async ({ page }) => {
  await page.goto(PATH);
  await page.getByRole("tab", { name: "Generate from repo or URL" }).click();
  await page.getByLabel("GitHub repo or live site URL").fill("not a url");
  await page.getByRole("button", { name: "Generate 3 taglines" }).click();
  await expect(page.getByTestId("tagline-error")).toHaveAttribute("data-code", "invalid_url");

  // A stale error goes as soon as the input changes or the mode switches.
  await page.getByLabel("GitHub repo or live site URL").fill("https://your-app.com");
  await expect(page.getByTestId("tagline-error")).toHaveCount(0);
  await page.getByLabel("GitHub repo or live site URL").fill("not a url");
  await page.getByRole("button", { name: "Generate 3 taglines" }).click();
  await expect(page.getByTestId("tagline-error")).toBeVisible();
  await page.getByRole("tab", { name: "Check a tagline" }).click();
  await page.getByRole("tab", { name: "Generate from repo or URL" }).click();
  await expect(page.getByTestId("tagline-error")).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("H1, rules, examples and FAQ are in the HTML", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Product Hunt tagline checker");
    await expect(page.getByRole("heading", { name: "Rules that actually matter" })).toBeVisible();
    await expect(page.getByTestId("tagline-examples").getByRole("listitem")).toHaveCount(6);
    await expect(page.getByRole("heading", { name: "After the tagline" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(5);
    await expect(page.getByRole("heading", { name: "How long can a Product Hunt tagline be?" })).toBeVisible();
  });
});
