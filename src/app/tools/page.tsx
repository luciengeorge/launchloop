import type { Metadata } from "next";
import { HubPage } from "@/components/hub-page";
import { GUIDES, guidePath } from "@/lib/guides";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = pageMetadata(PAGES.tools);

export default function ToolsPage() {
  return (
    <HubPage
      page={PAGES.tools}
      crumb="Tools"
      heading="Free launch tools"
      intro="Free tools for the fiddly parts of launch prep, with no sign-up. Each one checks one part of your launch against the platform's rules and tells you what to fix."
      items={TOOLS.map((t) => ({ path: t.path, title: t.title, description: t.description, updated: t.updated }))}
      related={{
        heading: "Launch guides",
        hubPath: PAGES.guides.path,
        hubLabel: "All launch guides",
        items: GUIDES.map((g) => ({ path: guidePath(g), title: g.title, description: g.description })),
      }}
    />
  );
}
