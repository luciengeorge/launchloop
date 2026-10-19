import { expect, test } from "@playwright/test";

const NEW_GUIDES = [
  { path: "/show-hn-launch-checklist", h1: "The Show HN launch checklist", title: /^Show HN checklist: how to post on Show HN · LaunchLoop$/, updated: "2026-10-18" },
  { path: "/how-to-write-a-product-hunt-tagline", h1: "How to write a Product Hunt tagline", title: /^How to write a Product Hunt tagline: examples · LaunchLoop$/, updated: "2026-10-18" },
  { path: "/how-to-promote-on-reddit", h1: "How to promote your app on Reddit", title: /^How to promote on Reddit: self-promotion rules · LaunchLoop$/, updated: "2026-10-19" },
] as const;

for (const guide of NEW_GUIDES) {
  test(`${guide.path} has metadata, Article and FAQPage JSON-LD, an FAQ and a CTA`, async ({ page, request }) => {
    const res = await page.goto(guide.path);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(guide.title);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(guide.h1);
    const title = await page.title();
    expect(title.length, title).toBeGreaterThanOrEqual(50);
    expect(title.length, title).toBeLessThanOrEqual(59);
    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(description.length, description).toBeGreaterThanOrEqual(138);
    expect(description.length, description).toBeLessThanOrEqual(158);
    expect(`${title} ${description}`).not.toMatch(/[\u2013\u2014]/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${guide.path}$`));
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new RegExp(`${guide.path}$`));
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator("article time").first()).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);

    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", new RegExp(`/og${guide.path}$`));
    const image = await request.get(`/og${guide.path}`);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = blocks.flatMap((text) => {
      const data = JSON.parse(text);
      return (data["@graph"] ?? [data]) as { "@type": string; mainEntity?: unknown[]; dateModified?: string }[];
    });
    expect(nodes.map((n) => n["@type"])).toEqual(expect.arrayContaining(["Article", "FAQPage", "BreadcrumbList"]));
    expect(nodes.find((n) => n["@type"] === "Article")?.dateModified).toBe(guide.updated);
    const faq = nodes.find((n) => n["@type"] === "FAQPage")!;
    expect(faq.mainEntity!.length).toBeGreaterThanOrEqual(4);
    await expect(page.locator("article #faq ~ div h3")).toHaveCount(faq.mainEntity!.length);

    const article = page.locator("article");
    await expect(article.locator('a[href="/#start"]').first()).toBeVisible();
    await expect(article.locator('a[href="/pricing"]').first()).toBeVisible();
    expect(await article.innerText()).not.toMatch(/[\u2013\u2014]/);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toMatch(new RegExp(`<loc>[^<]*${guide.path}</loc>\\s*<lastmod>${guide.updated}`));
    expect(await (await request.get("/llms.txt")).text()).toContain(guide.path);
    await expect(page.getByRole("navigation", { name: "Free tools and guides" }).locator(`a[href="${guide.path}"]`)).toBeVisible();

    await page.goto("/guides");
    await expect(page.locator(`main a[href="${guide.path}"]`).first()).toBeVisible();
  });
}

test("Show HN checklist cites the official Hacker News sources", async ({ page }) => {
  await page.goto("/show-hn-launch-checklist");
  for (const href of ["https://news.ycombinator.com/showhn.html", "https://news.ycombinator.com/newsguidelines.html", "https://news.ycombinator.com/newsfaq.html"]) {
    await expect(page.locator(`article a[href="${href}"]`).first()).toBeVisible();
  }
});

test("tagline guide and checker link to each other", async ({ page }) => {
  await page.goto("/how-to-write-a-product-hunt-tagline");
  await expect(page.locator('article a[href="/tools/product-hunt-tagline-checker"]').first()).toBeVisible();
  await page.goto("/tools/product-hunt-tagline-checker");
  await expect(page.locator('main a[href="/how-to-write-a-product-hunt-tagline"]').first()).toBeVisible();
});

test("Reddit guide cites Reddit's rules and the HN no-AI-text guidance, and links the Show HN checklist and OG preview", async ({ page }) => {
  await page.goto("/how-to-promote-on-reddit");
  const article = page.locator("article > div");
  for (const href of [
    "https://redditinc.com/policies/reddit-rules",
    "https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam",
    "https://support.reddithelp.com/hc/en-us/articles/360043066412-Disrupting-Communities",
    "https://news.ycombinator.com/newsguidelines.html",
    "https://news.ycombinator.com/item?id=22336638",
    "/show-hn-launch-checklist",
    "/tools/og-preview",
  ]) {
    await expect(article.locator(`a[href="${href}"]`).first()).toBeVisible();
  }
  await expect(page.locator("#sources")).toBeVisible();
  await expect(article).toContainText("made-up product");
});

test("Reddit guide is linked from the related guides and the OG preview tool", async ({ page }) => {
  for (const path of ["/show-hn-launch-checklist", "/product-hunt-launch-checklist", "/how-to-launch-a-vibe-coded-app"]) {
    await page.goto(path);
    await expect(page.locator('article > div a[href="/how-to-promote-on-reddit"]').first(), path).toBeVisible();
  }
  await page.goto("/tools/og-preview");
  await expect(page.locator('main a[href="/how-to-promote-on-reddit"]').first()).toBeVisible();
});

test("Show HN checklist is linked from the tools and the Product Hunt checklist", async ({ page }) => {
  for (const path of ["/tools/og-preview", "/tools/product-hunt-tagline-checker", "/product-hunt-launch-checklist"]) {
    await page.goto(path);
    await expect(page.locator('main a[href="/show-hn-launch-checklist"]').first()).toBeVisible();
  }
});
