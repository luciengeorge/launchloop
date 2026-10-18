export type Guide = {
  slug: string;
  title: string;
  /** Meta title, before the " · LaunchLoop" suffix: aim for 37 to 47 characters. */
  metaTitle: string;
  /** Meta description and on-page lede, 120 to 160 characters. */
  description: string;
  /** Last significant content change (YYYY-MM-DD): the sitemap lastmod and the Article's dateModified. */
  updated: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "product-hunt-launch-checklist",
    title: "The Product Hunt launch checklist",
    metaTitle: "Product Hunt launch checklist (2026 guide)",
    description:
      "A step-by-step Product Hunt launch checklist: what to prepare a week out, tagline and description limits, gallery image sizes and launch-day timing.",
    updated: "2026-10-15",
  },
  {
    slug: "how-to-launch-a-vibe-coded-app",
    title: "How to launch a vibe-coded app",
    metaTitle: "How to launch a vibe-coded app (step by step)",
    description:
      "Built your app with Cursor, Lovable, Bolt or v0? Fix the SEO basics AI builders skip, write copy from what the app does, and launch on Product Hunt and X.",
    updated: "2026-10-15",
  },
];

export const guidePath = (g: Pick<Guide, "slug">) => `/${g.slug}`;

export const guide = (slug: string) => GUIDES.find((g) => g.slug === slug)!;
