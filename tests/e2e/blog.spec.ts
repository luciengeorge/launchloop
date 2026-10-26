import { expect, type Page, test } from "@playwright/test";
import { BLOG_AUTHOR, BLOG_POSTS, blogPosts, postPath, type BlogPost } from "../../src/lib/blog";
import { GUIDES, guidePath } from "../../src/lib/guides";
import { OG_PREVIEW, TAGLINE_CHECKER } from "../../src/lib/tools";

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
  "how-to-launch-on-betalist": {
    links: [
      "/blog/how-to-launch-on-product-hunt",
      "/blog/how-to-launch-on-indie-hackers",
      "/product-hunt-launch-checklist",
      "/how-to-write-a-show-hn-post",
      "/how-to-promote-on-reddit",
      "/how-to-write-a-product-hunt-tagline",
      "/how-to-launch-a-vibe-coded-app",
      "/blog/product-hunt-alternatives",
      "/tools/og-preview",
      "https://betalist.com/help",
      "https://betalist.com/criteria",
      "https://betalist.com/help/submitting",
      "https://betalist.com/agent",
      "https://betalist.com/terms/submissions",
      "https://betalist.com/boost",
      "https://guides.betalist.com/designing-your-landing-page",
      "https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product",
      "https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines",
      "https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post",
      "https://www.producthunt.com/launch/how-product-hunt-works",
      "https://www.uneed.best/how-it-works",
      "https://help.uneed.best/common-questions-and-issues/what-we-accept",
      "https://news.ycombinator.com/showhn.html",
    ],
    quotes: [
      "All submissions are paid. There is no free submission option.",
      "Current plans and prices are shown at the end of the submission form.",
      "Each startup gets up to two opportunities to be featured: once pre-launch and once at launch.",
      "We feature around 20 new startups every day.",
      "Lite: featured within about 14 days. Standard: featured within about 3 days. Premium: featured within about 1 day.",
      "Most submissions wait days or weeks before publishing",
      "Priority listing guarantees faster review, not acceptance or any specific results.",
      "your startup may be featured on any day including weekends and holidays.",
      "All plans include a do-follow backlink if featured, and a full refund if not selected.",
      "Products that only offer an email sign-up are not eligible for the homepage.",
      "will not be indexed on the site, and no users will be able to upvote it until the scheduled time.",
      "Product Hunt is free for everyone to use.",
      "If it's behind a waitlist, an invite code, or a sales call, we can't review it",
      "Don't post landing pages or fundraisers.",
    ],
  },
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
  "og-image-size": {
    links: [
      "/tools/og-preview",
      "/product-hunt-launch-checklist#images",
      "/blog/how-to-launch-on-product-hunt",
      "/how-to-write-a-product-hunt-tagline",
      "https://www.linkedin.com/help/linkedin/answer/a521928",
      "https://www.linkedin.com/post-inspector/",
      "https://ogp.me/",
      "https://developers.facebook.com/documentation/sharing/webmasters/images",
      "https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image",
      "https://docs.slack.dev/messaging/unfurling-links-in-messages",
      "https://docs.discord.com/developers/link-previews/overview",
    ],
    quotes: [
      "Minimum image dimensions: 1200 (w) x 627 (h) pixels",
      "Use images that are at least 1200 x 630 pixels for the best display on high resolution devices.",
      "Images for this Card support an aspect ratio of 2:1 with minimum dimensions of 300x157 or maximum of 4096x4096 pixels.",
      "Slack crawls the URL, looks for common OpenGraph and X (formerly known as Twitter) Card metadata, and renders some micro-approximation of the content.",
      "If the page specifies an og:image it should specify og:image:alt.",
    ],
  },
  "product-hunt-alternatives": {
    links: [
      "/how-to-write-a-show-hn-post",
      "/show-hn-launch-checklist",
      "/how-to-promote-on-reddit",
      "/blog/how-to-launch-on-indie-hackers",
      "/blog/how-to-launch-on-product-hunt",
      "/product-hunt-launch-checklist",
      "/tools/product-hunt-tagline-checker",
      "/tools/og-preview",
      "https://betalist.com/help",
      "https://betalist.com/criteria",
      "https://devhunt.org/faq",
      "https://news.ycombinator.com/showhn.html",
      "https://www.uneed.best/how-it-works",
      "https://help.peerlist.io/individual/launchpad/guidelines-faqs",
      "https://fazier.com/submit",
      "https://www.tinystartups.com/terms",
      "https://microlaunch.net/premium",
    ],
    quotes: [
      "All submissions are paid. There is no free submission option.",
      "Each startup gets up to two opportunities to be featured: once pre-launch and once at launch.",
      "Launched months or years ago",
      "Newsletter slot (70k+ subscribers)",
      "DevHunt is a launchpad for developer tools, built by developers.",
      "Show HN is for something you've made that other people can play with.",
      "Submitting is not scheduling.",
      "at least 30 days out, at the back of the line.",
      "pick the exact date you want. Published with a do-follow backlink for life, no minimum upvote score.",
      "Anyone with a Verified Peerlist profile can launch their products on Peerlist Launchpad.",
      "Products rank over 1 month",
      "Launching is free; Skip the queue (£29) puts you in the next Monday batch",
      "All sales are final. We do not offer refunds.",
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

test("the alternatives post groups sites by fit, prices each one, and never lists LaunchLoop as a platform", async ({ page }) => {
  await page.goto("/blog/product-hunt-alternatives");
  for (const id of ["at-a-glance", "dev-tools", "early-stage", "general", "communities", "choosing"]) await expect(page.locator(`h2#${id}`)).toBeVisible();
  const sites = ["DevHunt", "Show HN", "BetaList", "r/alphaandbetausers", "Uneed", "Fazier", "Tiny Startups", "Microlaunch", "Peerlist Launchpad", "Indie Hackers", "r/SideProject"];
  const rows = page.locator("#at-a-glance + p + div table tbody tr");
  await expect(rows.locator("td:first-child")).toHaveText(sites);
  for (const id of ["devhunt", "show-hn", "betalist", "alphaandbetausers", "uneed", "fazier", "tiny-startups", "microlaunch", "peerlist", "indie-hackers", "sideproject"]) {
    await expect(page.locator(`h3#${id}`)).toBeVisible();
  }
  await expect(page.locator("article h3", { hasText: "LaunchLoop" })).toHaveCount(0);
  await expect(page.locator("article > div").first()).toContainText("LaunchLoop isn't a launch platform.");
});

test("the alternatives post links both free tools where they help, and no other /tools page", async ({ page, request }) => {
  await page.goto("/blog/product-hunt-alternatives");
  const body = page.locator("article > div").first();
  const toolLinks = await body.locator('a[href^="/tools"]').evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect([...new Set(toolLinks)].sort()).toEqual([OG_PREVIEW.path, TAGLINE_CHECKER.path].sort());

  const fazierSubmit = page.locator("h3#fazier ~ p", { hasText: "How to submit." }).first();
  await expect(fazierSubmit.locator(`a[href="${TAGLINE_CHECKER.path}"]`)).toHaveText("Product Hunt tagline checker");
  const sideProjectSubmit = page.locator("h3#sideproject ~ p", { hasText: "How to submit." }).first();
  await expect(sideProjectSubmit.locator(`a[href="${OG_PREVIEW.path}"]`)).toHaveText("OG image preview");
  const nextSteps = page.locator("h2#next + p");
  for (const t of [TAGLINE_CHECKER, OG_PREVIEW]) await expect(nextSteps.locator(`a[href="${t.path}"]`)).toBeVisible();

  for (const t of [TAGLINE_CHECKER, OG_PREVIEW]) expect((await request.get(t.path, { maxRedirects: 0 })).status(), t.path).toBe(200);
});

test("the alternatives post has Uneed's 21 October prices and wait, dates the table, and keeps the old ones out of the page and JSON-LD", async ({ page }) => {
  await page.goto("/blog/product-hunt-alternatives");
  const uneed = page.locator("#at-a-glance + p + div table tbody tr", { has: page.locator("td:first-child", { hasText: /^Uneed$/ }) });
  await expect(uneed.locator("td")).toHaveText(["Uneed", "Free waiting line, at least 30 days out", "Fast-track $14.99, Skip the waiting line $39.99, Relaunch $15"]);
  await expect(page.locator("#at-a-glance + p + div + p")).toHaveText("Prices checked on 21 October 2026.");

  const body = page.locator("article > div").first();
  await expect(body.locator("li", { hasText: "Skip the waiting line, $39.99." })).toBeVisible();
  await expect(body.locator("li", { hasText: "Count the wait." })).toContainText("Uneed's free line is at least 30 days away");
  const OLD = /29\.99|5 months|between 30 days and/i;
  await expect(page.locator("article")).not.toContainText(OLD);
  for (const raw of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(raw).not.toMatch(OLD);

  const faq = findNode<{ mainEntity: { name: string; acceptedAnswer: { text: string } }[] }>(await jsonLdNodes(page), "FAQPage");
  const visible = await page.locator("article #faq ~ div h3").allInnerTexts();
  expect(faq.mainEntity.map((q) => q.name)).toEqual(visible);
  for (const q of faq.mainEntity) await expect(body).toContainText(q.acceptedAnswer.text);
});

test("the alternatives post has BetaList's 24 October wording and none of its retired lines, in the page or the JSON-LD", async ({ page }) => {
  await page.goto("/blog/product-hunt-alternatives");
  const article = page.locator("article");
  await expect(article.locator('a[href^="https://betalist.com/faq"], a[href^="https://betalist.com/support"]')).toHaveCount(0);
  const OLD = /60k|Once pre-launch, and once during launch|weeks ago or longer|weeks old or more|recently launched or still be unreleased|not the right place to promote|BetaList FAQ|BetaList's FAQ|don't match/i;
  await expect(article).not.toContainText(OLD);
  for (const raw of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(raw).not.toMatch(OLD);
  await expect(page.locator("h3#betalist ~ p", { hasText: "Audience." }).first()).toContainText("70k+ subscribers");
});

test("the Product Hunt post hands the step-by-step to the checklist instead of repeating it", async ({ page }) => {
  const ph: BlogPost = BLOG_POSTS.find((p) => p.slug === "how-to-launch-on-product-hunt")!;
  await page.goto(postPath(ph));
  const body = page.locator("article > div").first();
  for (const id of ["how-it-works", "should-you-launch", "who-can-post", "scheduling", "upvotes", "listing", "launch-day"]) await expect(page.locator(`h2#${id}`)).toBeVisible();
  await expect(page.locator("h2#one-week-out, h2#checklist")).toHaveCount(0);
  await expect(body).not.toContainText("Post a mid-day update");

  const listing = await page.locator("h2#listing").evaluate((h2) => {
    const parts: string[] = [];
    const links: string[] = [];
    for (let el = h2.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) {
      parts.push((el as HTMLElement).innerText);
      el.querySelectorAll("a").forEach((a) => links.push(a.getAttribute("href") ?? ""));
    }
    return { text: parts.join("\n"), links };
  });
  expect(listing.links).toEqual(expect.arrayContaining(["/product-hunt-launch-checklist#the-listing", "/product-hunt-launch-checklist#images"]));
  for (const repeated of ["240x240", "1270x760", "260 characters", "60 characters", "Up to three topics", "first comment", "Only the product", "Maker comment"]) {
    expect(listing.text, repeated).not.toContain(repeated);
  }
  for (const kept of ["2+ images", "only YouTube links", "Google UTMs", "no penalty for linking directly", "free, paid, and paid", "three shoutouts"]) {
    expect(listing.text, kept).toContain(kept);
  }

  await page.goto("/product-hunt-launch-checklist");
  await expect(page).not.toHaveTitle(/how it works/i);
  await expect(page.locator("h2#the-listing")).toBeVisible();
  await expect(page.locator("h2#images")).toBeVisible();
});

test("the BetaList post says submissions are paid, gives only BetaList's public prices and never claims LaunchLoop submits", async ({ page }) => {
  await page.goto(postPath(BLOG_POSTS.find((p) => p.slug === "how-to-launch-on-betalist")!));
  const body = page.locator("article > div").first();
  for (const id of ["what-it-is", "what-qualifies", "landing-page", "how-to-submit", "pricing", "review", "featured-day", "after", "not-documented"]) {
    await expect(page.locator(`h2#${id}`)).toBeVisible();
  }

  const pricing = await page.locator("h2#pricing").evaluate((h2) => {
    const parts: string[] = [];
    for (let el = h2.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) parts.push((el as HTMLElement).innerText);
    return parts.join("\n");
  });
  expect(pricing).toContain("24 October 2026");
  expect(pricing).toContain("$99 a week or $199 a month");
  expect(pricing).toContain("doesn't give a figure");
  expect(pricing.match(/\$[\d,]+/g)).toEqual(["$99", "$199", "$4,999", "$9,999"]);

  await expect(body).toContainText("It doesn't submit anything for you");
  await expect(body).not.toContainText(/LaunchLoop (submits|will submit|posts it)/i);
  await expect(body.locator("q", { hasText: "Your startup must have its own domain" })).toBeVisible();
  await expect(body.locator("q", { hasText: "We do not accept app store links or pages hosted on free subdomains." })).toBeVisible();
});

test("the BetaList post compares pre-launch options in a dated table, has a readiness checklist and leaves LaunchLoop out of the table", async ({ page, request }) => {
  await page.goto(postPath(BLOG_POSTS.find((p) => p.slug === "how-to-launch-on-betalist")!));
  const body = page.locator("article > div").first();
  for (const id of ["checklist", "compared"]) await expect(page.locator(`h2#${id}`)).toBeVisible();

  const table = page.locator("#compared ~ div table").first();
  await expect(table.locator("thead th")).toHaveText(["Site", "Takes a pre-launch page?", "Price", "Wait", "Link to your site"]);
  const rows = table.locator("tbody tr");
  await expect(rows.locator("td:first-child")).toHaveText(["BetaList", "Product Hunt, scheduled launch", "Uneed", "Show HN"]);
  await expect(rows.nth(0).locator("td")).toHaveText([
    "BetaList",
    "Yes, with a way to sign up",
    "Paid only; prices shown at the end of the form; full refund if not selected",
    "About 14, 3 or 1 days to be featured, by plan",
    "Do-follow if featured, through a 301 redirect",
  ]);
  await expect(rows.nth(2).locator("td").nth(2)).toHaveText("Free line; Fast-track $14.99; Skip the waiting line $39.99");
  await expect(table).not.toContainText("LaunchLoop");
  await expect(page.locator("#compared ~ div + p").first()).toHaveText("Checked on 25 October 2026.");
  const compared = await page.locator("h2#compared").evaluate((h2) => {
    const parts: string[] = [];
    const links: string[] = [];
    for (let el = h2.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) {
      parts.push((el as HTMLElement).innerText);
      el.querySelectorAll("a").forEach((a) => links.push(a.getAttribute("href") ?? ""));
    }
    return { text: parts.join("\n"), links };
  });
  expect(compared.links).toContain("/blog/product-hunt-alternatives");
  expect(compared.text).toContain("isn't a launch board");
  expect(compared.text.match(/\$[\d.,]+/g)).toEqual(["$14.99", "$39.99"]);

  const checklist = page.locator("h2#checklist + p + ul > li");
  await expect(checklist).toHaveCount(11);
  for (const item of await checklist.all()) await expect(item.locator("strong").first()).toBeVisible();
  const og = page.locator(`h2#checklist + p + ul a[href="${OG_PREVIEW.path}"]`);
  await expect(og).toHaveText("OG image preview");
  expect((await request.get(OG_PREVIEW.path, { maxRedirects: 0 })).status()).toBe(200);
  const toolLinks = await body.locator('a[href^="/tools"]').evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect([...new Set(toolLinks)]).toEqual([OG_PREVIEW.path]);
});

test("the Indie Hackers post dates old advice and quotes the terms as they read now", async ({ page }) => {
  await page.goto(postPath(BLOG_POSTS.find((p) => p.slug === "how-to-launch-on-indie-hackers")!));
  const body = page.locator("article > div").first();
  await expect(body).toContainText("Indie Hackers retired groups in 2026");
  await expect(body.locator('a[href="https://www.indiehackers.com/groups"]').first()).toBeVisible();
  await expect(body.locator("q", { hasText: "Groups no longer exists." })).toBeVisible();
  await expect(body.locator("q", { hasText: "Indie Hackers retired this feature in 2026, and it's not coming back." })).toBeVisible();
  await expect(body).not.toContainText("no longer loads");
  await expect(body).not.toContainText("404");
  await expect(body.locator("h2#replies ~ ul strong").first()).toContainText("2019 and 2020 tips");
  await expect(body.locator("q", { hasText: "You will only use the Services for your own internal, personal, non-commercial use" })).toBeVisible();
  await expect(body.locator("h2#sources ~ p").first()).not.toContainText("Internet Archive");
});

test("the OG image size post labels X's archived docs, says where no size is published and calls 1600×900 house style", async ({ page }) => {
  await page.goto(postPath(BLOG_POSTS.find((p) => p.slug === "og-image-size")!));
  const body = page.locator("article > div").first();
  for (const id of ["quick-answer", "platforms", "meta-tags", "testing", "mistakes", "launch-images"]) await expect(page.locator(`h2#${id}`)).toBeVisible();

  const section = (id: string) =>
    page.locator(`h3#${id}`).evaluate((h3) => {
      const parts: string[] = [];
      const links: string[] = [];
      for (let el = h3.nextElementSibling; el && el.tagName !== "H3" && el.tagName !== "H2"; el = el.nextElementSibling) {
        parts.push((el as HTMLElement).innerText);
        el.querySelectorAll("a").forEach((a) => links.push(a.getAttribute("href") ?? ""));
      }
      return { text: parts.join("\n"), links };
    });

  const x = await section("x");
  await expect(page.locator("h3#x")).toContainText("archived docs");
  expect(x.text).toContain("12 January 2026");
  expect(x.text).toContain("Internet Archive");
  expect(x.links.filter((href) => href.includes("x.com")).length).toBeGreaterThan(0);
  for (const href of x.links.filter((h) => h.includes("x.com"))) expect(href).toMatch(/^https:\/\/web\.archive\.org\/web\/2026/);

  expect((await section("slack")).text).toContain("Slack doesn't publish an image size");
  expect((await section("discord")).text).toContain("They are examples, not a requirement.");
  expect((await section("disagree")).text).toMatch(/Facebook and LinkedIn say 1\.91:1\. X's archived docs say 2:1\./);
  expect((await section("facebook")).links).toContain("https://developers.facebook.com/documentation/sharing/webmasters");

  await expect(page.getByTestId("og-size-tags")).toContainText('<meta property="og:image:width" content="1200" />');
  await expect(page.getByTestId("og-size-tags")).toContainText('<meta name="twitter:card" content="summary_large_image" />');

  const launch = await page.locator("h2#launch-images").evaluate((h2) => {
    const parts: string[] = [];
    for (let el = h2.nextElementSibling; el && el.tagName !== "H2" && el.tagName !== "SECTION"; el = el.nextElementSibling) parts.push((el as HTMLElement).innerText);
    return parts.join("\n");
  });
  expect(launch).toContain("LaunchLoop's house style is a 1600×900 image for launch posts.");
  expect(launch).toContain("none of the docs above set a size for it");
  await expect(body).not.toContainText("all design their large card around");
});
