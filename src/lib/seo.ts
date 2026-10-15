import type { Metadata } from "next";
import { SITE } from "@/lib/site";

/** Per-page metadata with matching canonical, Open Graph and Twitter tags (child openGraph replaces the root's, so set it every time). */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  image = { url: "/opengraph-image", alt: `${SITE.name}: ${SITE.tagline}` },
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  /** A page-specific 1200×630 share image; defaults to the site image. */
  image?: { url: string; alt: string };
}): Metadata {
  const fullTitle = `${title} · ${SITE.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE.name, locale: "en_GB", url: path, title: fullTitle, description, images: [{ ...image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", site: SITE.twitter, title: fullTitle, description, images: [{ url: image.url, alt: image.alt }] },
  };
}
