import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { GUIDES } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ship-loop`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.7 },
    ...GUIDES.map((g) => ({ url: `${base}/${g.slug}`, lastModified: g.updated, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
