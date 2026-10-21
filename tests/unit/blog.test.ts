import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_AUTHOR, BLOG_POSTS, blogPosts, post, postPath, rssDate } from "@/lib/blog";
import { GUIDES, guide } from "@/lib/guides";
import { llmsText } from "@/lib/llms";
import { cardPages, indexablePages, PAGES, postPage } from "@/lib/pages";
import { blogFeed } from "@/lib/rss";
import { SITE } from "@/lib/site";

const BASE = "https://launchloop.test";
const DASHES = /[\u2013\u2014]/;
const fullTitle = (metaTitle: string) => `${metaTitle} · ${SITE.name}`;

describe("blog registry", () => {
  it.each(BLOG_POSTS.map((p) => [p.slug, p] as const))("%s has metadata inside the SEO limits and valid dates", (_slug, p) => {
    const title = fullTitle(p.metaTitle);
    expect(title.length, title).toBeGreaterThanOrEqual(50);
    expect(title.length, title).toBeLessThanOrEqual(59);
    expect(p.description.length, p.description).toBeGreaterThanOrEqual(138);
    expect(p.description.length, p.description).toBeLessThanOrEqual(158);
    expect(`${p.title} ${p.metaTitle} ${p.description}`).not.toMatch(DASHES);
    expect(p.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.updated >= p.published).toBe(true);
    expect(p.readingMinutes).toBeGreaterThanOrEqual(1);
  });

  it("the blog index has metadata inside the SEO limits and tracks the newest post", () => {
    const title = fullTitle(PAGES.blog.title);
    expect(title.length, title).toBeGreaterThanOrEqual(50);
    expect(title.length, title).toBeLessThanOrEqual(59);
    expect(PAGES.blog.description.length).toBeGreaterThanOrEqual(138);
    expect(PAGES.blog.description.length).toBeLessThanOrEqual(158);
    expect(`${PAGES.blog.title} ${PAGES.blog.description}`).not.toMatch(DASHES);
    expect(PAGES.blog.updated).toBe(BLOG_POSTS.map((p) => p.updated).sort().at(-1));
  });

  it("lists posts newest first", () => {
    const dates = blogPosts().map((p) => p.published);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("has slugs that don't collide with each other or with guides, so every /og/<slug> card is unique", () => {
    const slugs = [...GUIDES.map((g) => g.slug), ...BLOG_POSTS.map((p) => p.slug)];
    expect(new Set(slugs).size).toBe(slugs.length);
    const cards = cardPages().map((c) => c.slug);
    expect(new Set(cards).size).toBe(cards.length);
    for (const c of cards) expect(c, c).toMatch(/^[a-z0-9-]+$/);
  });

  it("every indexable page has a unique path, title and description", () => {
    const pages = indexablePages();
    for (const key of ["path", "title", "description"] as const) {
      const values = pages.map((p) => p[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
  });
});

describe("Product Hunt post", () => {
  const p = post("how-to-launch-on-product-hunt");
  const checklist = guide("product-hunt-launch-checklist");

  it("targets launching on Product Hunt without echoing the checklist's title or description", () => {
    expect(fullTitle(p.metaTitle)).toBe("How to launch on Product Hunt: how it works · LaunchLoop");
    expect(p.description).toMatch(/^Launching on Product Hunt/);
    for (const text of [p.title, p.metaTitle, p.description]) {
      expect(text).not.toMatch(/checklist|step-by-step|step by step/i);
    }
    expect(p.metaTitle).not.toBe(checklist.metaTitle);
    expect(p.description).not.toBe(checklist.description);
  });
});

describe("Product Hunt alternatives post", () => {
  const p = post("product-hunt-alternatives");

  it("targets both queries, is dated 22 October 2026 and doesn't echo the Product Hunt how-to", () => {
    expect(fullTitle(p.metaTitle)).toBe("Product Hunt alternatives: where to launch · LaunchLoop");
    expect(p.description).toMatch(/^Sites like Product Hunt/);
    expect(p).toMatchObject({ published: "2026-10-22", updated: "2026-10-22" });
    const listed = blogPosts();
    expect(listed.map((x) => x.slug)).toContain(p.slug);
    const dates = listed.map((x) => x.published);
    expect(dates).toEqual([...dates].sort().reverse());
    const howTo = post("how-to-launch-on-product-hunt");
    expect(p.metaTitle).not.toBe(howTo.metaTitle);
    expect(p.description).not.toBe(howTo.description);
  });
});

describe("blog pages", () => {
  it.each(BLOG_POSTS.map((p) => [p.slug, p] as const))("%s is an article at /blog/<slug> with its own /og/<slug> card", (slug, p) => {
    const page = postPage(p);
    expect(page).toMatchObject({ path: `/blog/${slug}`, type: "article", updated: p.updated });
    expect(page.image.url).toBe(`/og/${slug}`);
    expect(cardPages()).toContainEqual({ slug, card: { eyebrow: "Blog", headline: p.title } });
  });

  it("puts the blog index and every post in the sitemap with lastmod", () => {
    const entries = sitemap();
    expect(entries.find((e) => e.url.endsWith("/blog"))?.lastModified).toBe(PAGES.blog.updated);
    for (const p of BLOG_POSTS) {
      expect(entries.filter((e) => e.url.endsWith(postPath(p)))).toHaveLength(1);
      expect(entries.find((e) => e.url.endsWith(postPath(p)))?.lastModified).toBe(p.updated);
    }
  });

  it("adds a Blog section to llms.txt and llms-full.txt", () => {
    for (const full of [true, false]) {
      for (const promo of [true, false]) {
        const text = llmsText(BASE, full, promo);
        expect(text).toContain(`- [Blog](${BASE}/blog)`);
        expect(text).toContain("\n## Blog\n");
        for (const p of BLOG_POSTS) expect(text).toContain(`- [${p.title}](${BASE}${postPath(p)}) (published ${p.published}, by ${BLOG_AUTHOR.name}): ${p.description}`);
      }
    }
  });
});

describe("RSS feed", () => {
  const xml = blogFeed(BASE);

  it("is RSS 2.0 with a self link and absolute URLs", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"')).toBe(true);
    expect(xml).toContain(`<link>${BASE}/blog</link>`);
    expect(xml).toContain(`<atom:link href="${BASE}/blog/rss.xml" rel="self" type="application/rss+xml"/>`);
    for (const href of xml.matchAll(/<(?:link|guid[^>]*)>([^<]*)</g)) expect(href[1]).toMatch(/^https:\/\/launchloop\.test\//);
  });

  it("lists every post, newest first, with an RFC 822 pubDate and escaped text", () => {
    const links = [...xml.matchAll(/<item>[\s\S]*?<link>([^<]*)<\/link>/g)].map((m) => m[1]);
    expect(links).toEqual(blogPosts().map((p) => `${BASE}${postPath(p)}`));
    for (const p of BLOG_POSTS) expect(xml).toContain(`<pubDate>${rssDate(p.published)}</pubDate>`);
    expect(rssDate("2026-10-21")).toBe("Wed, 21 Oct 2026 00:00:00 GMT");
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    expect(xml).toContain("founders&apos; own advice");
  });
});
