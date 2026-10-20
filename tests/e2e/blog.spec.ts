import { expect, type Page, test } from "@playwright/test";
import { BLOG_AUTHOR, BLOG_POSTS, blogPosts, postPath, type BlogPost } from "../../src/lib/blog";
import { GUIDES, guidePath } from "../../src/lib/guides";

type JsonLdNode = { "@type": string; [key: string]: unknown };

async function jsonLdNodes(page: Page): Promise<JsonLdNode[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((raw) => {
    const data = JSON.parse(raw);
    expect(data["@context"]).toBe("https://schema.org");
    return data["@graph"] ?? [data];
  });
}

function findNode<T>(nodes: JsonLdNode[], type: string): T {
  const node = nodes.find((n) => n["@type"] === type);
  expect(node, type).toBeTruthy();
  return node as unknown as T;
}

const SELF = (path: string) => new RegExp(`^http://127\\.0\\.0\\.1:\\d+${path.replace(/\//g, "\\/")}$`);

/** Per post: links the copy must make, and quotes that must appear verbatim. */
const EXPECT: Record<string, { links: string[]; quotes: string[] }> = {
  "how-to-launch-on-product-hunt": {
    links: [
      "/product-hunt-launch-checklist",
      "/how-to-write-a-product-hunt-tagline",
      "/tools/product-hunt-tagline-checker",
      "/how-to-launch-a-vibe-coded-app",
      "https://help.producthunt.com/en/articles/17350772-launch-guide",
      "https://help.producthunt.com/en/articles/479557-how-to-post-a-product",
      "https://help.producthunt.com/en/articles/3615694-community-guidelines",
      "https://help.producthunt.com/en/articles/484935-can-i-ask-my-community-friends-family-to-upvote-a-product",
      "https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post",
      "https://www.producthunt.com/launch/how-product-hunt-works",
      "https://www.producthunt.com/launch/before-launch",
    ],
    quotes: [
      "never ask outright for upvotes or run anything that requires them. It breaks Product Hunt's rules and can get your launch disqualified.",
      "You can and should hunt your own product. There's no need for a special hunter.",
      "Every launch goes live at 12:01 AM Pacific on its scheduled date, so plan around that window.",
      "Hunting is just posting. A hunter can be anybody with a personal Product Hunt account. That can be you, your co-makers, or an enthusiastic user.",
    ],
  },
  "how-to-launch-on-indie-hackers": {
    links: [
      "/how-to-promote-on-reddit",
      "/show-hn-launch-checklist",
      "https://www.indiehackers.com/about",
      "https://www.indiehackers.com/terms",
      "https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a",
      "https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd",
    ],
    quotes: [
      "Start interesting discussions, ask useful questions, teach people what you've learned, and share links to relevant resources.",
      "One-sided announcements are boring.",
      "Our ranking algorithm rewards posts that generate discussion and have more comments.",
    ],
  },
};

test("/blog is a real page now, not a redirect, with every post newest first and a Guides section", async ({ page, request }) => {
  const res = await request.get("/blog", { maxRedirects: 0 });
  expect(res.status()).toBe(200);

  await page.goto("/blog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Blog");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", SELF("/blog"));
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", SELF("/blog/rss.xml"));

  const entries = page.locator("main ul").first().locator("article");
  await expect(entries).toHaveCount(BLOG_POSTS.length);
  const ordered = blogPosts();
  for (const [i, p] of ordered.entries()) {
    const entry = entries.nth(i);
    await expect(entry.getByRole("link", { name: p.title })).toHaveAttribute("href", postPath(p));
    await expect(entry).toContainText(p.description);
    await expect(entry.locator("time")).toHaveAttribute("datetime", p.published);
    await expect(entry).toContainText(`${p.readingMinutes} min read`);
  }

  const guides = page.locator("section", { has: page.getByRole("heading", { name: "Guides" }) });
  await expect(guides.locator('a[href="/guides"]')).toBeVisible();
  for (const g of GUIDES) await expect(guides.locator(`a[href="${guidePath(g)}"]`)).toBeVisible();
  await expect(guides.locator('a[href="/how-to-launch-a-vibe-coded-app"]')).toBeVisible();

  expect((await jsonLdNodes(page)).map((n) => n["@type"])).toEqual(expect.arrayContaining(["CollectionPage", "BreadcrumbList"]));
  await expect(page.getByRole("navigation", { name: "Free tools and guides" }).locator('a[href="/blog"]')).toBeVisible();
});

test("/blog/rss.xml is valid RSS 2.0 listing every post with absolute URLs", async ({ page, request }) => {
  const res = await request.get("/blog/rss.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/rss+xml");
  const xml = await res.text();

  await page.goto("/blog");
  const feed = await page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const channel = doc.querySelector("rss > channel");
    return {
      parseError: doc.querySelector("parsererror")?.textContent ?? null,
      version: doc.documentElement.getAttribute("version"),
      root: doc.documentElement.nodeName,
      title: channel?.querySelector(":scope > title")?.textContent,
      link: channel?.querySelector(":scope > link")?.textContent,
      description: channel?.querySelector(":scope > description")?.textContent,
      self: channel?.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "link")[0]?.getAttribute("href"),
      items: Array.from(doc.querySelectorAll("rss > channel > item")).map((item) => ({
        title: item.querySelector("title")?.textContent,
        link: item.querySelector("link")?.textContent,
        guid: item.querySelector("guid")?.textContent,
        description: item.querySelector("description")?.textContent,
        pubDate: item.querySelector("pubDate")?.textContent,
        creator: item.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "creator")[0]?.textContent,
      })),
    };
  }, xml);

  expect(feed.parseError).toBeNull();
  expect(feed).toMatchObject({ root: "rss", version: "2.0", title: "LaunchLoop blog" });
  expect(feed.link).toMatch(SELF("/blog"));
  expect(feed.self).toMatch(SELF("/blog/rss.xml"));
  expect(feed.description!.length).toBeGreaterThan(0);
  expect(feed.items.map((i) => i.title)).toEqual(blogPosts().map((p) => p.title));
  for (const [i, p] of blogPosts().entries()) {
    const item = feed.items[i];
    expect(item.link).toMatch(SELF(postPath(p)));
    expect(item.guid).toBe(item.link);
    expect(item.description).toBe(p.description);
    expect(item.creator).toBe(BLOG_AUTHOR.name);
    expect(new Date(item.pubDate!).toISOString().slice(0, 10)).toBe(p.published);
    expect((await request.get(new URL(item.link!).pathname, { maxRedirects: 0 })).status()).toBe(200);
  }
});

test("unknown blog paths are 404s, not redirects to the guides", async ({ request }) => {
  const res = await request.get("/blog/no-such-post", { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});

for (const p of BLOG_POSTS) {
  const path = postPath(p);

  test(`${path} has metadata, BlogPosting, BreadcrumbList and FAQPage JSON-LD, a byline and the CTA`, async ({ page, request }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.title);
    await expect(page).toHaveTitle(`${p.metaTitle} · LaunchLoop`);
    const title = await page.title();
    expect(title.length, title).toBeGreaterThanOrEqual(50);
    expect(title.length, title).toBeLessThanOrEqual(59);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", p.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", SELF(path));
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", SELF(path));
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", SELF("/blog/rss.xml"));

    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", SELF(`/og/${p.slug}`));
    const image = await request.get(`/og/${p.slug}`);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");

    const byline = page.getByTestId("byline");
    await expect(byline).toContainText(`By ${BLOG_AUTHOR.name}`);
    await expect(byline.locator("time").first()).toHaveAttribute("datetime", p.published);
    await expect(byline).toContainText(`${p.readingMinutes} min read`);

    const nodes = await jsonLdNodes(page);
    const posting = findNode<Record<string, unknown>>(nodes, "BlogPosting");
    expect(posting).toMatchObject({
      headline: p.title,
      description: p.description,
      datePublished: p.published,
      dateModified: p.updated,
      author: { "@type": "Person", name: BLOG_AUTHOR.name },
      publisher: { "@type": "Organization", name: "LaunchLoop" },
    });
    expect(posting.image).toMatch(SELF(`/og/${p.slug}`));
    expect(posting.mainEntityOfPage).toMatch(SELF(path));
    const crumbs = findNode<{ itemListElement: { name: string; item: string }[] }>(nodes, "BreadcrumbList");
    expect(crumbs.itemListElement.map((c) => c.name)).toEqual(["Home", "Blog", p.title]);
    expect(crumbs.itemListElement[2].item).toMatch(SELF(path));
    const faq = findNode<{ mainEntity: unknown[] }>(nodes, "FAQPage");
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
    await expect(page.locator("article #faq ~ div h3")).toHaveCount(faq.mainEntity.length);

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");

    const article = page.locator("article");
    await expect(article.locator('a[href="/#start"]').first()).toBeVisible();
    await expect(article.locator('a[href="/pricing"]').first()).toBeVisible();

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toMatch(new RegExp(`<loc>[^<]*${path}</loc>\\s*<lastmod>${p.updated}`));
    for (const llms of ["/llms.txt", "/llms-full.txt"]) {
      const text = await (await request.get(llms)).text();
      expect(text, llms).toContain("## Blog");
      expect(text, llms).toContain(`${path}) (published ${p.published}`);
    }
  });

  test(`${path} has no en or em dashes, an accurate reading time, sources and its contextual links`, async ({ page }) => {
    await page.goto(path);
    const body = page.locator("article > div").first();
    const text = (await page.locator("article").innerText()) + (await page.title()) + ((await page.locator('meta[name="description"]').getAttribute("content")) ?? "");
    expect(text).not.toMatch(/[\u2013\u2014]/);

    const words = (await body.innerText()).split(/\s+/).filter(Boolean).length;
    expect(p.readingMinutes, `${words} words`).toBe(Math.ceil(words / 200));

    await expect(page.locator("h2#sources")).toBeVisible();
    await expect(body).toContainText("Checked as of October 2026");
    const sources = await page.locator("h2#sources ~ ul a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(sources.length).toBeGreaterThan(3);
    for (const href of sources) expect(href).toMatch(/^https:\/\//);

    for (const href of EXPECT[p.slug].links) await expect(body.locator(`a[href="${href}"]`).first(), href).toBeVisible();
    for (const quote of EXPECT[p.slug].quotes) await expect(body.locator("q", { hasText: quote }).first(), quote).toBeVisible();
  });
}

test("the Product Hunt post hands the step-by-step to the checklist instead of repeating it", async ({ page }) => {
  const ph: BlogPost = BLOG_POSTS.find((p) => p.slug === "how-to-launch-on-product-hunt")!;
  await page.goto(postPath(ph));
  const body = page.locator("article > div").first();
  for (const id of ["how-it-works", "should-you-launch", "who-can-post", "scheduling", "upvotes", "listing", "launch-day"]) await expect(page.locator(`h2#${id}`)).toBeVisible();
  await expect(page.locator("h2#one-week-out, h2#checklist")).toHaveCount(0);
  await expect(body).not.toContainText("Post a mid-day update");

  await page.goto("/product-hunt-launch-checklist");
  await expect(page).not.toHaveTitle(/how it works/i);
});
