import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { isNewsletterCalendarOn } from "@/lib/newsletter-flag-server";
import { indexablePages } from "@/lib/pages";

/** Generated from the page registry: add pages to PAGES, GUIDES or TOOLS rather than here. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const calendarReward = await isNewsletterCalendarOn();
  return indexablePages({ calendarReward }).map((page) => ({ url: `${base}${page.path}`, lastModified: page.updated }));
}
