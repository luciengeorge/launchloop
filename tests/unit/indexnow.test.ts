import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS, postPath } from "@/lib/blog";
import { GUIDES, guidePath } from "@/lib/guides";
import {
  changedPaths,
  diffPaths,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  INDEXNOW_MAX_URLS,
  indexNowAccepted,
  indexNowBody,
  inSitemap,
  isGone,
  parseUrlList,
  routeOf,
  sitemapPaths,
} from "@/lib/indexnow";
import { TOOLS } from "@/lib/tools";
import { config } from "@/proxy";

const ROOT = path.join(import.meta.dirname, "../..");
const SLUGS = GUIDES.map((g) => g.slug);

describe("IndexNow key", () => {
  it("is 32 lowercase hex characters", () => {
    expect(INDEXNOW_KEY).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is served from public/<key>.txt with the key as the whole body", () => {
    expect(readFileSync(path.join(ROOT, "public", `${INDEXNOW_KEY}.txt`), "utf8")).toBe(INDEXNOW_KEY);
    expect(INDEXNOW_KEY_LOCATION).toBe(`https://launchloop.dev/${INDEXNOW_KEY}.txt`);
  });

  it("is the only key file in public/, so an old key can't linger", () => {
    expect(readdirSync(path.join(ROOT, "public")).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f))).toEqual([`${INDEXNOW_KEY}.txt`]);
  });

  it("is never touched by the proxy", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: `/${INDEXNOW_KEY}.txt` })).toBe(false);
  });
});

describe("routeOf", () => {
  it.each([
    ["src/app/blog/page.tsx", "/blog"],
    ["src/app/blog/how-to-launch-on-product-hunt/page.tsx", "/blog/how-to-launch-on-product-hunt"],
    ["src/app/tools/og-preview/opengraph-image.tsx", "/tools/og-preview"],
    ["src/app/(marketing)/faq/page.tsx", "/faq"],
    ["src/app/blog/[slug]/page.tsx", "/blog"],
    ["src/app/blog/_components/byline.tsx", "/blog"],
    ["src/app/page.tsx", "/"],
  ])("maps %s to %s", (file, route) => {
    expect(routeOf(file)).toBe(route);
  });

  it.each(["src/app/blog/rss.xml/route.ts", "src/app/llms.txt/route.ts", "src/lib/blog.ts", "README.md"])("ignores %s", (file) => {
    expect(routeOf(file)).toBeNull();
  });
});

describe("changedPaths", () => {
  const paths = (...files: string[]) => changedPaths(files, SLUGS);

  it("pings a changed post and the blog index", () => {
    expect(paths("src/app/blog/how-to-launch-on-product-hunt/page.tsx")).toEqual(["/blog", "/blog/how-to-launch-on-product-hunt"]);
  });

  it("pings every parent of a nested post", () => {
    expect(paths("src/app/blog/2026/launch/page.tsx")).toEqual(["/blog", "/blog/2026", "/blog/2026/launch"]);
  });

  it("pings a changed guide and the guides hub", () => {
    expect(paths("src/app/show-hn-launch-checklist/page.tsx")).toEqual(["/guides", "/show-hn-launch-checklist"]);
    expect(paths("src/app/guides/page.tsx")).toEqual(["/guides"]);
  });

  it("pings a changed tool and the tools hub", () => {
    expect(paths("src/app/tools/og-preview/page.tsx")).toEqual(["/tools", "/tools/og-preview"]);
    expect(paths("src/app/tools/page.tsx")).toEqual(["/tools"]);
  });

  it("selects a whole section when its registry changes", () => {
    expect(paths("src/lib/blog.ts")).toEqual(["/blog", "/blog/*"]);
    expect(paths("src/lib/tools.ts")).toEqual(["/tools", "/tools/*"]);
    expect(paths("src/lib/guides.ts")).toEqual(["/guides", ...GUIDES.map(guidePath)].sort());
  });

  it("ignores everything outside blog, guides and tools", () => {
    expect(paths("src/app/faq/page.tsx", "src/app/page.tsx", "src/app/blog/rss.xml/route.ts", "src/components/guide-layout.tsx", "docs/seo/x.md", "tests/e2e/blog.spec.ts")).toEqual([]);
  });

  it("dedupes across files", () => {
    expect(paths("src/app/blog/page.tsx", "src/app/blog/a/page.tsx", "src/app/blog/b/page.tsx")).toEqual(["/blog", "/blog/a", "/blog/b"]);
  });

  describe("against the real content", () => {
    const listed = new Set(sitemap().map((entry) => new URL(entry.url).pathname));
    const pages = [
      ...BLOG_POSTS.map((p) => [postPath(p), "/blog"]),
      ...GUIDES.map((g) => [guidePath(g), "/guides"]),
      ...TOOLS.map((t) => [t.path, "/tools"]),
    ];

    it.each(pages)("maps the page file for %s to itself and %s, both in the sitemap", (pagePath, hub) => {
      const file = `src/app${pagePath}/page.tsx`;
      expect(existsSync(path.join(ROOT, file)), file).toBe(true);
      expect(paths(file)).toEqual([hub, pagePath].sort());
      expect(listed.has(pagePath) && listed.has(hub)).toBe(true);
    });
  });
});

describe("diffPaths", () => {
  const diff = (...lines: string[]) => diffPaths(lines.join("\n"), SLUGS);

  it("pings modified and added pages as changed, with their hubs", () => {
    expect(diff("M\tsrc/app/blog/a/page.tsx", "A\tsrc/app/tools/new/page.tsx", "M\tREADME.md")).toEqual({
      changed: ["/blog", "/blog/a", "/tools", "/tools/new"],
      removed: [],
    });
  });

  it("lists a deleted post as removed and still pings the blog index", () => {
    expect(diff("D\tsrc/app/blog/old-post/page.tsx")).toEqual({ changed: ["/blog"], removed: ["/blog/old-post"] });
  });

  it("lists a renamed post's old path as removed and its new path as changed", () => {
    expect(diff("R100\tsrc/app/blog/old-slug/page.tsx\tsrc/app/blog/new-slug/page.tsx")).toEqual({
      changed: ["/blog", "/blog/new-slug"],
      removed: ["/blog/old-slug"],
    });
  });

  it("lists a deleted guide as removed and pings /guides", () => {
    expect(diff("D\tsrc/app/show-hn-launch-checklist/page.tsx")).toEqual({ changed: ["/guides"], removed: ["/show-hn-launch-checklist"] });
  });

  it("doesn't call a page removed when only one of its files went and another still maps to it", () => {
    expect(diff("D\tsrc/app/tools/og-preview/opengraph-image.tsx", "M\tsrc/app/tools/og-preview/page.tsx")).toEqual({
      changed: ["/tools", "/tools/og-preview"],
      removed: [],
    });
  });

  it("keeps a removed page out of changed even when a deleted child lists it as a parent", () => {
    expect(diff("D\tsrc/app/blog/a/page.tsx", "D\tsrc/app/blog/a/b/page.tsx")).toEqual({ changed: ["/blog"], removed: ["/blog/a", "/blog/a/b"] });
  });

  it("ignores deleted files outside blog, guides and tools, and blank lines", () => {
    expect(diff("D\tsrc/app/faq/page.tsx", "D\tsrc/lib/rss.ts", "", "R090\tdocs/a.md\tdocs/b.md")).toEqual({ changed: [], removed: [] });
  });

  it("sends only 404 and 410 as removals", () => {
    expect([200, 301, 308, 404, 410, 500, 0].filter(isGone)).toEqual([404, 410]);
  });
});

describe("sitemap matching", () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://launchloop.dev/</loc></url>
    <url><loc>https://launchloop.dev/blog</loc></url>
    <url><loc> https://launchloop.dev/blog/a </loc></url>
    <url><loc>https://launchloop.dev/tools/og-preview</loc></url>
    <url><loc>https://elsewhere.dev/blog/b</loc></url>
    <url><loc>not a url</loc></url>
  </urlset>`;
  const listed = sitemapPaths(xml);

  it("reads same-host paths only", () => {
    expect(listed).toEqual(["/", "/blog", "/blog/a", "/tools/og-preview"]);
  });

  it("keeps listed candidates, in sitemap order, and expands /prefix/*", () => {
    expect(inSitemap(["/blog/a", "/blog/gone", "/blog"], listed)).toEqual(["/blog", "/blog/a"]);
    expect(inSitemap(["/blog/*"], listed)).toEqual(["/blog/a"]);
    expect(inSitemap(["/*"], listed)).toEqual(listed);
  });
});

describe("parseUrlList", () => {
  it("accepts paths and launchloop.dev URLs, split on spaces, commas and new lines", () => {
    expect(parseUrlList("/blog/, https://launchloop.dev/faq\n/blog /")).toEqual({ paths: ["/blog", "/faq", "/"], rejected: [] });
  });

  it("strips a trailing slash from full URLs the same way as from paths", () => {
    expect(parseUrlList("https://launchloop.dev/blog/ https://launchloop.dev/tools/og-preview// https://launchloop.dev/ https://launchloop.dev").paths).toEqual([
      "/blog",
      "/tools/og-preview",
      "/",
    ]);
  });

  it("rejects other hosts, http and junk", () => {
    expect(parseUrlList("https://example.com/x http://launchloop.dev/faq junk").rejected).toEqual(["https://example.com/x", "http://launchloop.dev/faq", "junk"]);
  });
});

describe("IndexNow request", () => {
  it("sends host, key, keyLocation and absolute URLs, capped", () => {
    const many = Array.from({ length: INDEXNOW_MAX_URLS + 5 }, (_, i) => `/p${i}`);
    const body = indexNowBody(many);
    expect(body).toMatchObject({ host: "launchloop.dev", key: INDEXNOW_KEY, keyLocation: INDEXNOW_KEY_LOCATION });
    expect(body.urlList).toHaveLength(INDEXNOW_MAX_URLS);
    expect(body.urlList[0]).toBe("https://launchloop.dev/p0");
  });

  it("treats 200 and 202 as accepted", () => {
    expect([200, 202, 400, 403, 422, 429].filter(indexNowAccepted)).toEqual([200, 202]);
  });
});

describe("scripts/indexnow.mts", () => {
  it("loads under plain Node, which only resolves imports with a file extension", () => {
    const out = execFileSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/indexnow.mts", "--help"], { cwd: ROOT, encoding: "utf8" });
    expect(out).toContain("npm run indexnow -- deploy");
  });
});
