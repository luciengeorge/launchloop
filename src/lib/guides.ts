export type Guide = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  updated: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "product-hunt-launch-checklist",
    title: "The Product Hunt launch checklist",
    metaTitle: "Product Hunt launch checklist (2026)",
    description:
      "A step-by-step Product Hunt launch checklist: what to prepare a week out, the exact tagline and description limits, gallery image sizes, launch-day timing and the rules that get launches penalised.",
    updated: "2026-10-15",
  },
  {
    slug: "how-to-launch-a-vibe-coded-app",
    title: "How to launch a vibe-coded app",
    metaTitle: "How to launch a vibe-coded app",
    description:
      "Built your app with Cursor, Lovable, Bolt or v0? How to get it launch-ready: fix the SEO basics AI builders skip, write copy from what the app actually does, and launch on Product Hunt, X and LinkedIn.",
    updated: "2026-10-15",
  },
];

export const guide = (slug: string) => GUIDES.find((g) => g.slug === slug)!;
