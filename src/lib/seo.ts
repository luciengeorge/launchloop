import type { Metadata } from "next";
import { BLOG_FEED_PATH } from "@/lib/blog";
import type { SitePage } from "@/lib/pages";
import { DEFAULT_SHARE_IMAGE, SITE } from "@/lib/site";

/** For the opengraph-image routes that never change between deploys: cached at the edge for a day, then served stale while revalidating for a week. */
export const STATIC_OG_HEADERS = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

/** Per-page metadata with matching canonical, Open Graph and Twitter tags (child openGraph replaces the root's, so set it every time). */
export function pageMetadata({
  title,
  absoluteTitle = false,
  description,
  path,
  type = "website",
  image = DEFAULT_SHARE_IMAGE,
}: Pick<SitePage, "title" | "description" | "path"> & Partial<Pick<SitePage, "absoluteTitle" | "type" | "image">>): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE.name, locale: "en_GB", url: path, title: fullTitle, description, images: [{ ...image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", site: SITE.twitter, title: fullTitle, description, images: [{ url: image.url, alt: image.alt }] },
  };
}

/** pageMetadata plus the <link rel="alternate"> to the blog's RSS feed, for the blog index and every post. */
export function blogPageMetadata(page: SitePage): Metadata {
  const metadata = pageMetadata(page);
  return { ...metadata, alternates: { ...metadata.alternates, types: { "application/rss+xml": [{ url: BLOG_FEED_PATH, title: `${SITE.name} blog` }] } } };
}
