import { GUIDES, guidePath, type Guide } from "@/lib/guides";
import type { ShareCard } from "@/lib/og-card";
import { SITE } from "@/lib/site";
import { TOOLS, type Tool } from "@/lib/tools";

/**
 * An indexable public page. The sitemap, page metadata, share images and the hub pages all read from this shape,
 * so a page added here (or to GUIDES / TOOLS) is wired up everywhere at once.
 */
export type SitePage = {
  path: string;
  /** Meta title. The root template appends " · LaunchLoop" unless absoluteTitle is set, so aim for 37 to 47 characters here. */
  title: string;
  absoluteTitle?: boolean;
  /** Meta description, 120 to 160 characters. */
  description: string;
  /** Last significant change to the page's main content (YYYY-MM-DD). Drives the sitemap lastmod: bump it when the copy changes. */
  updated: string;
  type: "website" | "article";
  /** 1200×630 share image. */
  image: { url: string; alt: string };
  /** Text for the generated share image served at /og/<slug>. */
  card?: ShareCard;
};

type CorePage = Omit<SitePage, "type" | "image"> & { card: ShareCard };

const core = (page: CorePage): SitePage => ({ ...page, type: "website", image: { url: `/og${page.path}`, alt: `${page.card.headline} · ${SITE.name}` } });

export const PAGES = {
  home: {
    path: "/",
    title: `${SITE.name}: Turn your GitHub repo into a launch kit`,
    absoluteTitle: true,
    description:
      "Paste your GitHub repo or live URL and LaunchLoop drafts your landing page copy, Product Hunt post, X thread, LinkedIn post and on-brand images. Free preview.",
    updated: "2026-10-15",
    type: "website",
    image: { url: "/opengraph-image", alt: `${SITE.name}: ${SITE.tagline}` },
  },
  pricing: core({
    path: "/pricing",
    title: "Pricing: free preview, £19 kit and Ship Loop",
    description:
      "Try LaunchLoop free, then pay £19 once for a full launch kit: landing copy, Product Hunt post, X thread, LinkedIn post and images. Ship Loop is coming soon.",
    updated: "2026-10-15",
    card: { eyebrow: "Pricing", headline: "Try it free. Pay £19 once to launch." },
  }),
  shipLoop: core({
    path: "/ship-loop",
    title: "Ship Loop: draft posts for every release",
    description:
      "Coming soon: Ship Loop drafts an X post, LinkedIn post, changelog blurb and image for every release, for you to approve. £12/month or £99/year. Pre-order now.",
    updated: "2026-10-15",
    card: { eyebrow: "Ship Loop · Coming soon", headline: "Draft posts and an image for every release" },
  }),
  faq: core({
    path: "/faq",
    title: "FAQ: launch kits, character limits and refunds",
    description: "How LaunchLoop reads your repo, what's in the £19 Launch Kit, which character limits it enforces, refunds, and the Ship Loop subscription.",
    updated: "2026-10-15",
    card: { eyebrow: "FAQ", headline: "Launch kits, character limits and refunds" },
  }),
  guides: core({
    path: "/guides",
    title: "Launch guides for indie makers and vibe coders",
    description:
      "Free guides for launching an app built with Cursor, Lovable, Bolt or v0: Product Hunt prep, launch copy, social images and the SEO basics to fix first.",
    updated: "2026-10-18",
    card: { eyebrow: "Guides", headline: "Launch guides for indie makers" },
  }),
  tools: core({
    path: "/tools",
    title: "Free launch tools for makers and indie hackers",
    description:
      "Free launch tools with no sign-up: check your Product Hunt tagline against the 60-character limit and preview the card your link shows when it's shared.",
    updated: "2026-10-18",
    card: { eyebrow: "Free tools", headline: "Free launch tools, no sign-up" },
  }),
  privacy: core({
    path: "/privacy",
    title: "Privacy policy: what we collect and why",
    description:
      "What data LaunchLoop collects when you preview or buy a launch kit, why we need it, who we share it with, how long we keep it and how to use your rights.",
    updated: "2026-10-15",
    card: { eyebrow: "Privacy", headline: "What we collect and why" },
  }),
  terms: core({
    path: "/terms",
    title: "Terms of service: previews, kits and refunds",
    description:
      "The terms for using LaunchLoop: the free preview and its limits, buying a £19 Launch Kit, refunds within 14 days, and pre-ordering the Ship Loop subscription.",
    updated: "2026-10-15",
    card: { eyebrow: "Terms", headline: "Previews, kits and refunds" },
  }),
} satisfies Record<string, SitePage>;

export function guidePage(g: Guide): SitePage {
  const path = guidePath(g);
  return {
    path,
    title: g.metaTitle,
    description: g.description,
    updated: g.updated,
    type: "article",
    image: { url: `/og${path}`, alt: `${g.title} · ${SITE.name}` },
    card: { eyebrow: "Guide", headline: g.title },
  };
}

export function toolPage(t: Tool): SitePage {
  return { path: t.path, title: t.metaTitle, description: t.description, updated: t.updated, type: "website", image: { url: `${t.path}/opengraph-image`, alt: t.imageAlt } };
}

/** Every page that belongs in the sitemap. Redirect aliases, noindex pages and robots-disallowed paths must never be added. */
export function indexablePages(): SitePage[] {
  return [...Object.values(PAGES), ...TOOLS.map(toolPage), ...GUIDES.map(guidePage)];
}

/** Pages with a generated share image, keyed by the single path segment used in /og/<slug>. */
export function cardPages(): { slug: string; card: ShareCard }[] {
  return indexablePages().flatMap((p) => (p.card ? [{ slug: p.path.slice(1), card: p.card }] : []));
}
