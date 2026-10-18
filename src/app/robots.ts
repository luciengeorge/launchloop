import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { POSTHOG_PROXY_PATH } from "@/lib/posthog-config";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/kit/", "/checkout/", "/account", "/login", `${POSTHOG_PROXY_PATH}/`] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
