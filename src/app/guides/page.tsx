import type { Metadata } from "next";
import { HubPage } from "@/components/hub-page";
import { GUIDES, guidePath } from "@/lib/guides";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = pageMetadata(PAGES.guides);

export default function GuidesPage() {
  return (
    <HubPage
      page={PAGES.guides}
      crumb="Guides"
      heading="Launch guides"
      intro="Step-by-step guides for getting an app in front of people: what to prepare, the limits each platform enforces, and the rules that get launches penalised."
      items={GUIDES.map((g) => ({ path: guidePath(g), title: g.title, description: g.description, updated: g.updated }))}
      related={{
        heading: "Free tools",
        hubPath: PAGES.tools.path,
        hubLabel: "All free tools",
        items: TOOLS.map((t) => ({ path: t.path, title: t.title, description: t.description })),
      }}
    />
  );
}
