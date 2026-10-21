import { expect, test } from "@playwright/test";

const PATH = "/tools/og-preview";
const FIXTURE = "http://127.0.0.1:3419";

test("OG preview has its own title, meta, canonical, share image and JSON-LD", async ({ page, request }) => {
  await page.goto(PATH);
  await expect(page).toHaveTitle("OG Image Preview & Checker (1200×630) · LaunchLoop");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("OG image preview");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Open Graph.*1200×630.*launch kit\.$/);
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
  expect(await (await request.get("/llms.txt")).text()).toContain(PATH);

  await expect(page.locator(`main a[href="/#start"]`).first()).toBeVisible();
  await expect(page.locator(`main a[href="/pricing"]`).first()).toBeVisible();
  for (const href of ["/product-hunt-launch-checklist", "/how-to-launch-a-vibe-coded-app", "/tools/product-hunt-tagline-checker"]) {
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  }
  const body = (await page.locator("main").innerText()).toLowerCase();
  expect(body).not.toMatch(/\bupvot|\bvotes?\b/);
});

test("the size copy matches the sources, and the size FAQ is one sentence plus a link to the blog post, in the page and the JSON-LD", async ({ page }) => {
  await page.goto(PATH);
  const size = page.locator("h2#size + ul");
  await expect(size).not.toContainText("all design their large card around");
  await expect(size).toContainText("X's archived docs describe a 2:1 image and Slack publishes no size");

  const q = "What size should an Open Graph image be?";
  const answer = page.locator("section", { has: page.getByRole("heading", { level: 3, name: q }) }).locator("p");
  await expect(answer.locator('a[href="/blog/og-image-size"]')).toHaveText("See what each platform's docs say.");
  const visible = ((await answer.textContent()) ?? "").trim();
  expect(visible.replace(/ See what each platform's docs say\.$/, "").match(/[.!?](\s|$)/g)).toHaveLength(1);

  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const faq = (graph["@graph"] as { "@type": string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] }[]).find((n) => n["@type"] === "FAQPage")!;
  const text = faq.mainEntity.find((e) => e.name === q)!.acceptedAnswer.text;
  expect(text).toMatch(/<a href="http:\/\/127\.0\.0\.1:\d+\/blog\/og-image-size">See what each platform's docs say\.<\/a>$/);
  expect(text.replace(/<[^>]+>/g, "")).toBe(visible);

  await page.locator('a[href="/blog/og-image-size"]').first().click();
  await expect(page).toHaveURL(/\/blog\/og-image-size$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("OG image size for X, LinkedIn, Facebook and Slack");
});

test("short alias redirects to the tools URL", async ({ request }) => {
  const res = await request.get("/og-preview", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toMatch(new RegExp(`${PATH}$`));
});

test("OG preview is reachable from the footer, home hero, header and both guides", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Free tools and guides" }).locator(`a[href="${PATH}"]`)).toBeVisible();
  await expect(page.locator("#start").getByRole("link", { name: "preview your link card" })).toBeVisible();
  if (!isMobile) await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "OG preview" })).toBeVisible();
  for (const path of ["/product-hunt-launch-checklist", "/how-to-launch-a-vibe-coded-app"]) {
    await page.goto(path);
    await expect(page.locator("article").locator(`a[href="${PATH}"]`).first()).toBeVisible();
  }
});

test("well-tagged page: card at 1200×630, every check passes, deep link to the free preview", async ({ page }) => {
  await page.goto(PATH);
  const url = `${FIXTURE}/og/good`;
  await page.getByLabel("Live page URL").fill(url);
  await page.getByRole("button", { name: "Preview card" }).click();

  await expect(page.getByTestId("og-verdict")).toHaveAttribute("data-verdict", "pass");
  await expect(page.getByTestId("og-card-title")).toHaveText("Pagebird: turn customer calls into product specs");
  await expect(page.getByTestId("og-card-description")).toContainText("ranked specs");
  await expect(page.getByTestId("og-image-size")).toHaveText("1200×630");
  const frame = (await page.getByTestId("og-card-image").boundingBox())!;
  expect(frame.width / frame.height).toBeCloseTo(1200 / 630, 1);
  await expect(page.getByTestId("og-card-image").locator("img")).toHaveJSProperty("naturalWidth", 1200);

  for (const id of ["title", "description", "image", "image-size", "image-tags", "twitter-card", "url"]) {
    await expect(page.locator(`[data-check="${id}"]`)).toHaveAttribute("data-status", "pass");
  }
  await expect(page.getByTestId("og-cta")).toContainText("Your link card is ready.");
  await expect(page.getByTestId("og-cta-start")).toHaveAttribute("href", `/?url=${encodeURIComponent(url)}#start`);
  await expect(page.getByTestId("og-cta").locator('a[href="/pricing"]')).toBeVisible();

  await page.getByTestId("og-cta-start").click();
  await page.waitForURL(/\/\?url=.*#start$/);
  await expect(page.getByLabel("GitHub repo or live site URL")).toHaveValue(url);
});

test("missing tags and a small, relative, square-ish image get clear fixes", async ({ page }) => {
  await page.goto(PATH);
  await page.getByLabel("Live page URL").fill(`${FIXTURE}/og/bad`);
  await page.getByRole("button", { name: "Preview card" }).click();

  await expect(page.getByTestId("og-verdict")).toHaveAttribute("data-verdict", "fail");
  await expect(page.locator('[data-check="title"]')).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="description"]')).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="image"]')).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="image"]')).toContainText("relative");
  await expect(page.locator('[data-check="image-size"]')).toHaveAttribute("data-status", "fail");
  await expect(page.locator('[data-check="image-size"]')).toContainText("400×400");
  await expect(page.locator('[data-check="twitter-card"]')).toContainText("summary_large_image");
  await expect(page.getByTestId("og-card-title")).toHaveText("Snapshelf");
  await expect(page.getByTestId("og-cta")).toContainText("Want a share image that passes every check?");
  await expect(page.getByTestId("og-tags")).toContainText("missing");
});

test("wrong aspect ratio, broken image and no tags at all", async ({ page }) => {
  await page.goto(PATH);
  const input = page.getByLabel("Live page URL");
  const go = page.getByRole("button", { name: "Preview card" });

  await input.fill(`${FIXTURE}/og/square`);
  await go.click();
  await expect(page.locator('[data-check="image-size"]')).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="image-size"]')).toContainText("too tall");

  await input.fill(`${FIXTURE}/og/broken-image`);
  await go.click();
  await expect(page.locator('[data-check="image"]')).toHaveAttribute("data-status", "fail");
  await expect(page.locator('[data-check="image"]')).toContainText("HTTP 404");
  await expect(page.getByTestId("og-card-image")).toHaveAttribute("data-has-image", "false");

  await input.fill(`${FIXTURE}/og/none`);
  await go.click();
  await expect(page.locator('[data-check="title"]')).toHaveAttribute("data-status", "fail");
  await expect(page.locator('[data-check="image"]')).toContainText("No og:image");
});

test("friendly errors for bad input and unreachable pages", async ({ page }) => {
  await page.goto(PATH);
  const input = page.getByLabel("Live page URL");
  const go = page.getByRole("button", { name: "Preview card" });
  for (const { value, code } of [
    { value: "not a url", code: "invalid_url" },
    { value: `${FIXTURE}/broken`, code: "site_http_error" },
    { value: `${FIXTURE}/data.json`, code: "site_not_html" },
  ]) {
    await input.fill(value);
    await go.click();
    await expect(page.getByTestId("og-error")).toHaveAttribute("data-code", code);
    await expect(page.getByTestId("og-error")).not.toContainText("GitHub repo");
  }
});

test("try-it button previews LaunchLoop itself and keeps the plain CTA", async ({ page }) => {
  await page.goto(PATH);
  await page.getByRole("button", { name: "Try it on LaunchLoop" }).click();
  await expect(page.getByTestId("og-image-size")).toHaveText("1200×630");
  await expect(page.locator('[data-check="image-size"]')).toHaveAttribute("data-status", "pass");
  await expect(page.getByTestId("og-cta-start")).toHaveAttribute("href", "/#start");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("H1, tips, pitfalls and FAQ are in the HTML", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("OG image preview");
    await expect(page.getByRole("heading", { name: "The 1200×630 rule" })).toBeVisible();
    await expect(page.getByTestId("og-tags-example")).toContainText('twitter:card" content="summary_large_image"');
    await expect(page.getByTestId("og-pitfalls").getByRole("listitem")).toHaveCount(6);
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(5);
    await expect(page.getByRole("heading", { name: "What size should an Open Graph image be?" })).toBeVisible();
  });
});
