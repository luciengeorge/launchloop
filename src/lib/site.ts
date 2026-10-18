import { PRODUCTS } from "./products";

/** Marks a Launch Kit price mention in shared copy. Render with <PricedText>, or kitPriceText() for plain text (JSON-LD, slugs). */
export const KIT_PRICE_TOKEN = "{kitPrice}";
export const kitPriceText = (text: string) => text.replaceAll(KIT_PRICE_TOKEN, PRODUCTS.kit.priceLabel);

export const SITE = {
  name: "LaunchLoop",
  tagline: "Paste your repo. Get your whole launch.",
  description:
    "LaunchLoop reads your GitHub repo and live site, then writes your landing page copy, Product Hunt post, X thread and LinkedIn post, and renders on-brand social images. Free preview, £19 once for the full kit.",
  shortDescription: "Turn a vibe-coded app into a complete launch kit in minutes.",
  twitter: "@launchloop",
  email: "hello@launchloop.dev",
} as const;

/** What an unpaid kit page actually shows. Keep every free-tier mention in sync with this. */
export const FREE_PREVIEW = ["Product brief from your repo", "Product Hunt tagline", "First post of your X thread", "3 watermarked images"] as const;

/** Free preview allowance per IP, as stated in the copy, terms and privacy page. */
export const PREVIEW_LIMITS = { perHour: 5, perDay: 20 } as const;

export const KIT_CONTENTS = [
  { title: "Landing page copy", body: "Hero headline, subheadline, CTA, 3 to 6 feature blocks, plus meta title and description sized for Google." },
  { title: "Product Hunt post", body: "Name, tagline (60 chars), description (260 chars), topics and a maker comment that asks for feedback, never votes." },
  { title: "X launch thread", body: "5 to 7 posts, each checked against X's 280-character weighting, with your link in the right place." },
  { title: "LinkedIn post", body: "A launch post with a strong first line and short paragraphs, well under LinkedIn's 3,000-character limit." },
  { title: "3 on-brand images", body: "1200×630 Open Graph, 1600×900 post image and a 1270×760 Product Hunt gallery shot, in your site's colours." },
  { title: "Launch-day checklist", body: "What to post where and when, in order, so launch day is copy, paste, reply." },
] as const;

export const FAQ = [
  {
    q: "What is LaunchLoop?",
    a: "LaunchLoop turns an app you've built into a ready-to-post launch kit. Paste a public GitHub repo or your live URL and it reads your README, package.json, recent commits and landing page, writes a short product brief, then drafts all your launch copy and social images from it.",
  },
  {
    q: `What do I get for ${KIT_PRICE_TOKEN}?`,
    a: "Landing page copy (headline, subheadline, CTA, features, meta tags), a Product Hunt post (tagline, description, topics, maker comment), a 5 to 7 post X thread, a LinkedIn post, three on-brand social images and a launch-day checklist, for one app. You pay once; it's not a subscription. You get it on a results page, as a ZIP download and by email.",
  },
  {
    q: "What's free?",
    a: "The product brief, your Product Hunt tagline, the first post of your X thread and three watermarked images. No account or card needed. Free previews work with public repos and live sites, up to 5 an hour and 20 a day.",
  },
  {
    q: "Do you need access to my code?",
    a: "Only public repos for now. We read the README, package.json and the last 20 commit messages through GitHub's public API, plus your live page. We never clone your repo, and private repos aren't supported in this version.",
  },
  {
    q: "Does it work for apps built with Lovable, Bolt, v0 or Cursor?",
    a: "Yes, that's who it's built for. If your app is a single-page app with little server-rendered text, we lean on your repo, README and meta tags instead.",
  },
  {
    q: "Will the copy break Product Hunt's rules?",
    a: "No. Product Hunt and Hacker News ban asking for upvotes or coordinating votes, and Hacker News also bans asking for comments. LaunchLoop never writes those requests and strips any that slip in. The copy just invites people to check out your launch.",
  },
  {
    q: "Which character limits do you enforce?",
    a: "Product Hunt tagline 60 and description 260 characters, X posts 280 (weighted the way X counts them, with links as 23), LinkedIn 3,000, meta titles 60 and meta descriptions 155. Every limit is checked before you see the kit.",
  },
  {
    q: "How are the images made?",
    a: "We pull your brand colours from your site's CSS and theme colour, then render three images at the exact sizes Open Graph, X and the Product Hunt gallery expect.",
  },
  {
    q: "Does LaunchLoop post for me?",
    a: "No. Everything is a draft you review and post yourself. That keeps you in control and within each platform's rules.",
  },
  {
    q: "What if I'm not happy with my kit?",
    a: "Email hello@launchloop.dev or reply to your kit email within 14 days of buying and we'll refund you in full, for any reason.",
  },
  {
    q: "What is Ship Loop?",
    a: "Ship Loop is a separate subscription for after launch, coming soon (£12/month or £99/year). Every time you ship a release, it drafts an X post, a LinkedIn post, a changelog blurb and an image in your colours, and emails them to you to approve or edit. It never posts for you. Join the waitlist or pre-order now. Bought a Launch Kit? Subscribe within 14 days of buying it and we credit the £19.",
  },
] as const;
