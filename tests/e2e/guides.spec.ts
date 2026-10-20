import { expect, type Locator, test } from "@playwright/test";
import { GUIDES } from "../../src/lib/guides";

const NEW_GUIDES = [
  { path: "/show-hn-launch-checklist", h1: "The Show HN launch checklist", title: /^Show HN checklist: how to post on Show HN · LaunchLoop$/, updated: "2026-10-20" },
  { path: "/how-to-write-a-product-hunt-tagline", h1: "How to write a Product Hunt tagline", title: /^How to write a Product Hunt tagline: examples · LaunchLoop$/, updated: "2026-10-18" },
  { path: "/how-to-promote-on-reddit", h1: "How to promote your app on Reddit", title: /^How to promote on Reddit: self-promotion rules · LaunchLoop$/, updated: "2026-10-19" },
  { path: "/how-to-write-a-show-hn-post", h1: "How to write a Show HN post", title: /^How to write a Show HN post: title and text · LaunchLoop$/, updated: "2026-10-20" },
] as const;

/** Verbatim quotes from sources (marked up as <q> or <blockquote>) that keep their original dash. Any other quote is still dash-checked. */
const VERBATIM_DASH_QUOTES = new Set(["Show HN: Enkel \u2013 A clean and simple RSS Reader"]);

/** The article's own copy, without the allowlisted verbatim quotes. */
const proseText = (article: Locator) =>
  article.evaluate((el, allowed) => {
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("q, blockquote").forEach((quote) => {
      if (allowed.includes((quote.textContent ?? "").trim())) quote.remove();
    });
    return copy.textContent ?? "";
  }, [...VERBATIM_DASH_QUOTES]);

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
    expect(await proseText(article)).not.toMatch(/[\u2013\u2014]/);

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

test("Product Hunt checklist quotes and links Product Hunt's own pages on upvotes and direct links", async ({ page, request }) => {
  await page.goto("/product-hunt-launch-checklist");
  const rules = page.locator("h2#rules + p");
  for (const href of [
    "https://help.producthunt.com/en/articles/17350772-launch-guide",
    "https://help.producthunt.com/en/articles/2690626-how-do-i-share-my-post",
    "https://help.producthunt.com/en/articles/11869098-how-does-product-hunt-ensure-fair-voting-and-prevent-spam-or-vote-manipulation",
    "https://www.producthunt.com/launch/launch-day-questions",
  ]) {
    await expect(rules.locator(`a[href="${href}"]`), href).toBeVisible();
  }
  await expect(rules.locator("q", { hasText: "You\u2019re welcome to share a direct link to your post with your community, friends, or users." })).toBeVisible();
  await expect(rules.locator("q", { hasText: "There is no penalty for linking directly to your product, in actuality, we encourage it!" })).toBeVisible();
  await expect(rules).not.toContainText("direct link to vote");
  await expect(rules).not.toContainText("lots of new accounts");
  expect(await rules.innerText()).not.toMatch(/[\u2013\u2014]/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toMatch(/<loc>[^<]*\/product-hunt-launch-checklist<\/loc>\s*<lastmod>2026-10-20/);
});

test("every guide's Article JSON-LD dates publication from published and modification from updated", async ({ page }) => {
  for (const g of GUIDES) {
    await page.goto(`/${g.slug}`);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const article = blocks
      .flatMap((text) => {
        const data = JSON.parse(text);
        return (data["@graph"] ?? [data]) as { "@type": string; datePublished?: string; dateModified?: string }[];
      })
      .find((n) => n["@type"] === "Article");
    expect(article, g.slug).toMatchObject({ datePublished: g.published, dateModified: g.updated });
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
  await expect(article).toContainText("Think project, not product");
  await expect(article).toContainText("Users can self promote their product 1 time using the Self Promotion flair.");
  await expect(article).toContainText("no proof, no post");
  await expect(page.locator('a[href*="share_your_startup_quarterly_post"]')).toHaveCount(0);
});

test("guides hub description mentions Reddit", async ({ page }) => {
  await page.goto("/guides");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Reddit/);
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

test("Show HN post guide quotes and links Hacker News's own rules and moderators, with a checked-as-of note", async ({ page }) => {
  await page.goto("/how-to-write-a-show-hn-post");
  const article = page.locator("article > div");
  for (const href of [
    "https://news.ycombinator.com/showhn.html",
    "https://news.ycombinator.com/newsguidelines.html",
    "https://news.ycombinator.com/newsfaq.html",
    "https://news.ycombinator.com/item?id=22336638",
    "https://news.ycombinator.com/item?id=22336296",
    "https://news.ycombinator.com/item?id=23263421",
    "https://news.ycombinator.com/item?id=27041703",
    "https://news.ycombinator.com/item?id=20773107",
    "https://news.ycombinator.com/item?id=27317842",
    "https://news.ycombinator.com/item?id=46333434",
    "https://news.ycombinator.com/item?id=46704026",
    "https://news.ycombinator.com/item?id=46705186",
    "https://news.ycombinator.com/item?id=47561124",
    "https://news.ycombinator.com/item?id=49561867",
    "https://news.ycombinator.com/item?id=49984080",
    "/show-hn-launch-checklist",
    "/how-to-write-a-product-hunt-tagline",
  ]) {
    await expect(article.locator(`a[href="${href}"]`).first(), href).toBeVisible();
  }
  await expect(page.locator("#sources")).toBeVisible();
  await expect(article).toContainText("Checked as of October 2026");
  await expect(article.locator("q", { hasText: 'To post, submit a story whose title begins with "Show HN".' })).toBeVisible();
  await expect(article.locator("q", { hasText: "Show HN: Enkel \u2013 A clean and simple RSS Reader" })).toBeVisible();
  await expect(article.locator("q", { hasText: "make the title say in a neutral and direct way what this product/project is." })).toBeVisible();
  await expect(article.locator("q", { hasText: "Write your text by hand. Don't use an LLM to generate any of it" })).toBeVisible();
  for (const id of ["who-you-are-writing-for", "title", "link-or-text", "text", "tone", "replies"]) await expect(page.locator(`h2#${id}`)).toBeVisible();

  const dashes = await article.evaluate((el) =>
    Array.from(el.querySelectorAll("*"))
      .flatMap((node) => Array.from(node.childNodes))
      .filter((n) => n.nodeType === Node.TEXT_NODE && /[\u2013\u2014]/.test(n.textContent ?? ""))
      .map((n) => n.parentElement?.closest("q, blockquote") !== null),
  );
  expect(dashes.length).toBeGreaterThan(0);
  expect(dashes.every(Boolean)).toBe(true);
});

test("Show HN checklist and Show HN post guide link both ways, and the checklist hands the writing detail to the guide", async ({ page }) => {
  await page.goto("/show-hn-launch-checklist");
  const checklist = page.locator("article > div");
  await expect(checklist.locator('a[href="/how-to-write-a-show-hn-post"]').first()).toBeVisible();
  await expect(checklist.locator('a[href="/how-to-write-a-show-hn-post#text"]')).toBeVisible();
  await expect(checklist.locator('a[href="/how-to-write-a-show-hn-post#replies"]')).toBeVisible();
  await expect(checklist).not.toContainText("GRIDCAST, the future of dashboards");
  await expect(checklist.locator("h2#timing")).toBeVisible();

  await page.goto("/how-to-write-a-show-hn-post");
  await expect(page.locator('article > div a[href="/show-hn-launch-checklist#replies"]')).toBeVisible();
  await expect(page.locator("article > div")).toContainText("GRIDCAST, the future of dashboards");
});
