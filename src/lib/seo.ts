import type { Metadata } from "next";
import { SITE } from "@/lib/site";

/** Per-page metadata with matching canonical, Open Graph and Twitter tags (child openGraph replaces the root's, so set it every time). */
export function pageMetadata({ title, description, path, type = "website" }: { title: string; description: string; path: string; type?: "website" | "article" }): Metadata {
  const fullTitle = `${title} · ${SITE.name}`;
  const image = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE.name}: ${SITE.tagline}` };
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE.name, locale: "en_GB", url: path, title: fullTitle, description, images: [image] },
    twitter: { card: "summary_large_image", site: SITE.twitter, title: fullTitle, description, images: ["/opengraph-image"] },
  };
}
