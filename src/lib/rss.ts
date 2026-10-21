import { BLOG_AUTHOR, BLOG_FEED_PATH, blogPosts, postPath, rssDate } from "@/lib/blog";
import { PAGES } from "@/lib/pages";
import { SITE } from "@/lib/site";

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** RSS 2.0 for /blog/rss.xml, newest post first, with absolute URLs throughout. */
export function blogFeed(base: string): string {
  const posts = blogPosts();
  const items = posts.map((p) => {
    const url = `${base}${postPath(p)}`;
    return [
      "    <item>",
      `      <title>${escapeXml(p.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <description>${escapeXml(p.description)}</description>`,
      `      <dc:creator>${escapeXml(BLOG_AUTHOR.name)}</dc:creator>`,
      `      <pubDate>${rssDate(p.published)}</pubDate>`,
      "    </item>",
    ].join("\n");
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`${SITE.name} blog`)}</title>
    <link>${escapeXml(`${base}${PAGES.blog.path}`)}</link>
    <description>${escapeXml(PAGES.blog.description)}</description>
    <language>en-gb</language>
    <lastBuildDate>${rssDate(PAGES.blog.updated)}</lastBuildDate>
    <atom:link href="${escapeXml(`${base}${BLOG_FEED_PATH}`)}" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>
`;
}
