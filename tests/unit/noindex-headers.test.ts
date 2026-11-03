import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { describe, expect, it } from "vitest";
import { NOINDEX_IMAGE_SOURCES } from "@/lib/noindex-headers";

// The options Next uses to compile headers() sources into routes-manifest regexes (lib/build-custom-route).
const matchers = NOINDEX_IMAGE_SOURCES.map((source) => getPathMatch(source, { strict: true }));
const isNoindex = (path: string) => matchers.some((match) => match(path) !== false);

describe("X-Robots-Tag: noindex sources", () => {
  it.each([
    "/og/faq",
    "/og/how-to-launch-on-product-hunt",
    "/opengraph-image",
    "/twitter-image",
    "/tools/og-preview/opengraph-image",
    "/tools/some-new-tool/opengraph-image",
    "/blog/a-post/twitter-image",
    "/a/b/c/opengraph-image",
    "/shop/opengraph-image/1",
    "/opengraph-image.png",
    "/about/twitter-image.jpg",
  ])("match %s", (path) => expect(isNoindex(path)).toBe(true));

  it.each([
    "/",
    "/faq",
    "/blog",
    "/blog/how-to-launch-on-product-hunt",
    "/blog/og-image-size",
    "/blog/rss.xml",
    "/sitemap.xml",
    "/robots.txt",
    "/tools/og-preview",
    "/og-preview",
    "/opengraph-images",
    "/my-opengraph-image",
    "/api/og/abc/hero",
  ])("leave %s alone", (path) => expect(isNoindex(path)).toBe(false));
});
