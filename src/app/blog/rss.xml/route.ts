import { siteUrl } from "@/lib/env";
import { blogFeed } from "@/lib/rss";

export function GET() {
  return new Response(blogFeed(siteUrl()), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
