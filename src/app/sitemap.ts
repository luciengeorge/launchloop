import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { indexablePages } from "@/lib/pages";

/** Generated from the page registry: add pages to PAGES, GUIDES or TOOLS rather than here. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return indexablePages().map((page) => ({ url: `${base}${page.path}`, lastModified: page.updated }));
}
