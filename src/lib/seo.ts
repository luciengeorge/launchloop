import type { Metadata } from "next";
import type { SitePage } from "@/lib/pages";
import { SITE } from "@/lib/site";

/** For the opengraph-image routes that never change between deploys: cached at the edge for a day, then served stale while revalidating for a week. */
export const STATIC_OG_HEADERS = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

/** Per-page metadata with matching canonical, Open Graph and Twitter tags (child openGraph replaces the root's, so set it every time). */
export function pageMetadata({
  title,
  absoluteTitle = false,
  description,
  path,
  type = "website",
  image = { url: "/opengraph-image", alt: `${SITE.name}: ${SITE.tagline}` },
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
