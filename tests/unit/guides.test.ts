import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/lib/blog";
import { GUIDES, guide, guidePath } from "@/lib/guides";
import { llmsText } from "@/lib/llms";
import { cardPages, guidePage, indexablePages } from "@/lib/pages";
import { SITE } from "@/lib/site";

const BASE = "https://launchloop.test";
const DASHES = /[\u2013\u2014]/;

describe("guide registry", () => {
  it.each(GUIDES.map((g) => [g.slug, g] as const))("%s has metadata inside the SEO limits", (_slug, g) => {
    const title = `${g.metaTitle} · ${SITE.name}`;
    expect(title.length, title).toBeGreaterThanOrEqual(50);
    expect(title.length, title).toBeLessThanOrEqual(59);
    expect(g.description.length, g.description).toBeGreaterThanOrEqual(138);
    expect(g.description.length, g.description).toBeLessThanOrEqual(158);
    expect(`${g.title} ${g.metaTitle} ${g.description}`).not.toMatch(DASHES);
    expect(g.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("has unique slugs, meta titles and descriptions, including against blog posts", () => {
    const all = [...GUIDES, ...BLOG_POSTS];
    for (const key of ["slug", "metaTitle", "description"] as const) expect(new Set(all.map((g) => g[key])).size, key).toBe(all.length);
  });
});

describe("Show HN post guide", () => {
  const g = guide("how-to-write-a-show-hn-post");

  it("is registered with the writing-focused title and keyword", () => {
    expect(g).toBeDefined();
    expect(g.title).toBe("How to write a Show HN post");
    expect(`${g.metaTitle} · ${SITE.name}`).toBe("How to write a Show HN post: title and text · LaunchLoop");
    expect(g.description).toMatch(/^How to write a Show HN post /);
  });

  it("gets an article page with its own share image and card", () => {
    const page = guidePage(g);
    expect(page).toMatchObject({ path: "/how-to-write-a-show-hn-post", type: "article", updated: "2026-10-20" });
    expect(page.image.url).toBe("/og/how-to-write-a-show-hn-post");
    expect(cardPages()).toContainEqual({ slug: "how-to-write-a-show-hn-post", card: { eyebrow: "Guide", headline: "How to write a Show HN post" } });
  });

  it("is in the sitemap and llms.txt, alongside the Show HN checklist", () => {
    expect(indexablePages().filter((p) => p.path === guidePath(g))).toHaveLength(1);
    const entries = sitemap();
    expect(entries.find((e) => e.url.endsWith("/how-to-write-a-show-hn-post"))?.lastModified).toBe("2026-10-20");
    expect(entries.find((e) => e.url.endsWith("/show-hn-launch-checklist"))?.lastModified).toBe("2026-10-20");
    for (const promo of [true, false]) {
      const text = llmsText(BASE, false, promo);
      expect(text).toContain(`[How to write a Show HN post](${BASE}/how-to-write-a-show-hn-post)`);
      expect(text).toContain(`${BASE}/show-hn-launch-checklist`);
    }
  });
});
