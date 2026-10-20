import type { Metadata } from "next";
import { HubPage } from "@/components/hub-page";
import { blogPosts, postPath } from "@/lib/blog";
import { GUIDES, guidePath } from "@/lib/guides";
import { PAGES } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";

export const metadata: Metadata = blogPageMetadata(PAGES.blog);

export default function BlogPage() {
  return (
    <HubPage
      page={PAGES.blog}
      crumb="Blog"
      heading="Blog"
      intro="How-tos for launching an app, built on each platform's own help pages, rules and guidance. Every rule or piece of guidance is quoted from its source and linked, so you can check it before you post."
      items={blogPosts().map((p) => ({ path: postPath(p), title: p.title, description: p.description, published: p.published, readingMinutes: p.readingMinutes }))}
      related={{
        heading: "Guides",
        hubPath: PAGES.guides.path,
        hubLabel: "All launch guides",
        items: GUIDES.map((g) => ({ path: guidePath(g), title: g.title, description: g.description })),
      }}
    />
  );
}
