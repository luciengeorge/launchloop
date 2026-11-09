export type BlogPost = {
  slug: string;
  title: string;
  /** Meta title, before the " · LaunchLoop" suffix: 37 to 46 characters. */
  metaTitle: string;
  /** Meta description and on-page lede, 138 to 158 characters. */
  description: string;
  /** First publication (YYYY-MM-DD): the RSS pubDate and the BlogPosting's datePublished. */
  published: string;
  /** Last significant content change (YYYY-MM-DD): the sitemap lastmod and the BlogPosting's dateModified. */
  updated: string;
  /** Body word count / 200, rounded up. The e2e suite recounts it from the rendered post. */
  readingMinutes: number;
};

/** Every post is written by the founder. A Person with a name only: no bio or credentials are published. */
export const BLOG_AUTHOR = { name: "Lucien George" } as const;

export const BLOG_FEED_PATH = "/blog/rss.xml";

/** Newest first, so add new posts at the top. */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "show-hn-title-checkers-compared",
    title: "Which Show HN title checker should you use? Compared on the same ten titles",
    metaTitle: "Which Show HN title checker should you use?",
    description:
      "Compare Show HN title checkers on the same ten titles: what each flags, which rule it cites and what it misses. Includes LaunchLoop's own checker.",
    published: "2026-11-09",
    updated: "2026-11-09",
    readingMinutes: 6,
  },
  {
    slug: "betalist-vs-uneed",
    title: "BetaList or Uneed: which should an indie app launch on?",
    metaTitle: "BetaList or Uneed for an indie app launch?",
    description:
      "BetaList or Uneed for your indie app? Costs, queues and rules quoted from each site's own pages, with the date we read them and what to expect.",
    published: "2026-11-09",
    updated: "2026-11-09",
    readingMinutes: 5,
  },
  {
    slug: "launchloop-alternatives",
    title: "LaunchLoop alternatives: what other launch kits write",
    metaTitle: "LaunchLoop alternatives: launch kits compared",
    description:
      "Looking for LaunchLoop alternatives? Free launch kits from their own pages, next to what LaunchLoop's free preview returns on the same jobs.",
    published: "2026-11-09",
    updated: "2026-11-09",
    readingMinutes: 5,
  },
  {
    slug: "product-hunt-vs-show-hn",
    title: "Product Hunt or Show HN: where should a developer launch first?",
    metaTitle: "Product Hunt or Show HN: which first?",
    description:
      "Product Hunt or Show HN for a developer tool? Their own rules side by side, what each asks of a launch, and our checkers run on one launch text.",
    published: "2026-11-09",
    updated: "2026-11-09",
    readingMinutes: 6,
  },
  {
    slug: "product-hunt-launch-tools",
    title: "Product Hunt launch tools, tested on one repo",
    metaTitle: "Product Hunt launch tools, tested on one repo",
    description:
      "Looking for the best Product Hunt launch tools? We ran one open-source repo through 10 free tiers and checked the copy and images against Product Hunt specs.",
    published: "2026-10-27",
    updated: "2026-10-27",
    readingMinutes: 21,
  },
  {
    slug: "og-image-size",
    title: "OG image size for X, LinkedIn, Facebook and Slack",
    metaTitle: "OG image size: X, LinkedIn, Facebook and Slack",
    description:
      "Open Graph image size from each platform's own docs: a safe 1200×630 default, what Facebook, LinkedIn, X and Slack say, the tags to set and how to test it.",
    published: "2026-10-26",
    updated: "2026-10-26",
    readingMinutes: 15,
  },
  {
    slug: "how-to-launch-on-betalist",
    title: "How to launch on BetaList",
    metaTitle: "How to launch on BetaList: submission guide",
    description:
      "How to launch on BetaList from its own pages: who it is for, what it rejects, how submission and paid plans work, review times and the day you are featured.",
    published: "2026-10-25",
    updated: "2026-10-27",
    readingMinutes: 23,
  },
  {
    slug: "product-hunt-alternatives",
    title: "Product Hunt alternatives for indie makers",
    metaTitle: "Product Hunt alternatives: where to launch",
    description:
      "Sites like Product Hunt, from their own pages: who BetaList, Uneed, Peerlist, DevHunt, Show HN and others are for, what a launch costs and the rules.",
    published: "2026-10-24",
    updated: "2026-10-24",
    readingMinutes: 20,
  },
  {
    slug: "how-to-launch-on-product-hunt",
    title: "How to launch on Product Hunt",
    metaTitle: "How to launch on Product Hunt: how it works",
    description:
      "Launching on Product Hunt, from its own help center: how it works, whether to launch there, who can post, the rules on upvotes, and what follows launch day.",
    published: "2026-10-21",
    updated: "2026-10-26",
    readingMinutes: 18,
  },
  {
    slug: "how-to-launch-on-indie-hackers",
    title: "How to launch on Indie Hackers",
    metaTitle: "How to launch on Indie Hackers: what to post",
    description:
      "How to launch on Indie Hackers from its founders' own advice: what the site is for, where to post, the self-promotion line and writing a post people answer.",
    published: "2026-10-21",
    updated: "2026-10-21",
    readingMinutes: 12,
  },
];

export const postPath = (p: Pick<BlogPost, "slug">) => `/blog/${p.slug}`;

export const post = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug)!;

/** Newest first by publish date; posts published the same day keep their registry order. */
export const blogPosts = () => [...BLOG_POSTS].sort((a, b) => b.published.localeCompare(a.published));

/** The blog index changes whenever a post does. */
export const blogUpdated = () => BLOG_POSTS.map((p) => p.updated).sort().at(-1)!;

/** "21 October 2026" from "2026-10-21", in UTC so the day never shifts with the server's time zone. */
export const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** RFC 822 date for RSS, at midnight UTC on the given day. */
export const rssDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toUTCString();
