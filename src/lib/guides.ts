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
    updated: "2026-10-20",
  },
  {
    slug: "how-to-launch-a-vibe-coded-app",
    title: "How to launch a vibe-coded app",
    metaTitle: "How to launch a vibe-coded app (step by step)",
    description:
      "Built your app with Cursor, Lovable, Bolt or v0? Fix the SEO basics AI builders skip, write copy from what the app does, and launch on Product Hunt and X.",
    updated: "2026-10-15",
  },
  {
    slug: "show-hn-launch-checklist",
    title: "The Show HN launch checklist",
    metaTitle: "Show HN checklist: how to post on Show HN",
    description:
      "A Show HN checklist: how to post on Show HN without breaking the rules, from what qualifies and the title format to your first comment, timing and replies.",
    updated: "2026-10-20",
  },
  {
    slug: "how-to-write-a-product-hunt-tagline",
    title: "How to write a Product Hunt tagline",
    metaTitle: "How to write a Product Hunt tagline: examples",
    description:
      "How to write a Product Hunt tagline that earns the click: six formulas, good and weak examples, mistakes to avoid, and how it fits with your listing.",
    updated: "2026-10-18",
  },
  {
    slug: "how-to-promote-on-reddit",
    title: "How to promote your app on Reddit",
    metaTitle: "How to promote on Reddit: self-promotion rules",
    description:
      "How to promote your app on Reddit without getting banned: Reddit's self-promotion rules, how subreddit rules differ, and how to write a post that stays up.",
    updated: "2026-10-19",
  },
  {
    slug: "how-to-write-a-show-hn-post",
    title: "How to write a Show HN post",
    metaTitle: "How to write a Show HN post: title and text",
    description:
      "How to write a Show HN post from Hacker News's own rules: the title format, link or text post, what to say in your text, the tone, and how to reply.",
    updated: "2026-10-20",
  },
];

export const guidePath = (g: Pick<Guide, "slug">) => `/${g.slug}`;

export const guide = (slug: string) => GUIDES.find((g) => g.slug === slug)!;
