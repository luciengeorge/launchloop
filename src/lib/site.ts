import { LIMITS } from "./limits";
import { LAUNCH_PROMO, PRODUCTS } from "./products";

/** Marks a Launch Kit price mention in shared copy. Render with <PricedText>, or kitPriceText() for plain text (JSON-LD, llms.txt, slugs). */
export const KIT_PRICE_TOKEN = "{kitPrice}";

/** The kit price as plain text, where a struck-through price can't be shown: "£19", or "£14 with code LAUNCH14" while exp_launch14_promo is on. */
export const kitPriceLabel = (promo: boolean) => (promo ? `${LAUNCH_PROMO.priceLabel} with code ${LAUNCH_PROMO.code}` : PRODUCTS.kit.priceLabel);
export const kitPriceText = (text: string, promo: boolean) => text.replaceAll(KIT_PRICE_TOKEN, kitPriceLabel(promo));

/**
 * Static strings (meta tags, share cards, SITE.description) don't name the kit price: they can't follow exp_launch14_promo,
 * so they'd show £19 next to a page selling it for £14. Put prices in page copy with <KitPrice>, or in text with kitPriceText().
 */
export const SITE = {
  name: "LaunchLoop",
  tagline: "Paste your repo. Get your whole launch.",
  description:
    "LaunchLoop reads your GitHub README, package.json and recent commits, plus your live site, then writes your landing page copy, Product Hunt post, X thread and LinkedIn post, and renders on-brand social images. Free preview, then pay once for the full kit.",
  shortDescription: "Turn a vibe-coded app into a complete launch kit in minutes.",
  twitter: "@launchloop",
  email: "hello@launchloop.dev",
} as const;

/** The default share image (/opengraph-image), used by the home page and every page without its own: its two headline lines and alt text. */
export const DEFAULT_SHARE_HEADLINE = ["Your repo in.", "All your launch posts out."] as const;
export const DEFAULT_SHARE_IMAGE = { url: "/opengraph-image", alt: `${SITE.name}: ${DEFAULT_SHARE_HEADLINE.join(" ")}` };

/** What an unpaid kit page actually shows. Keep every free-tier mention in sync with this. */
export const FREE_PREVIEW = ["Product brief from your repo", "Product Hunt tagline", "First post of your X thread", "3 watermarked images"] as const;

/** "See an example kit" in the home hero (exp_hero_sample_cta): a static page of the sample app's kit (see EXAMPLE_KIT). */
export const EXAMPLE_KIT_PATH = "/example-kit";

/** Default free preview allowance per IP. Copy states resolvedPreviewLimits(), which is this unless an env override is set. */
export const PREVIEW_LIMITS = { perHour: 10, perDay: 40 } as const;

export interface PreviewLimits {
  perHour: number;
  perDay: number;
}

/** A missing, malformed or non-positive override falls back to the default rather than refusing every preview. */
function previewLimitOverride(raw: string | undefined, fallback: number): number {
  const value = raw?.trim() ? Number(raw) : NaN;
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

/**
 * The free preview allowance the rate limiter enforces: PREVIEW_LIMITS unless PREVIEW_RATE_LIMIT_PER_HOUR or
 * PREVIEW_RATE_LIMIT_PER_DAY overrides it. Those env vars only exist on the server; in the browser this gives the
 * defaults, so client components take the numbers from the server (the `limits` on a rate_limited response).
 */
export const resolvedPreviewLimits = (): PreviewLimits => ({
  perHour: previewLimitOverride(process.env.PREVIEW_RATE_LIMIT_PER_HOUR, PREVIEW_LIMITS.perHour),
  perDay: previewLimitOverride(process.env.PREVIEW_RATE_LIMIT_PER_DAY, PREVIEW_LIMITS.perDay),
});

export const KIT_CONTENTS = [
  { title: "Landing page copy", body: "Hero headline, subheadline, CTA, 3 to 6 feature blocks, plus meta title and description sized for Google." },
  { title: "Product Hunt post", body: "Name, tagline (60 chars), description (260 chars), topics and a maker comment that asks for feedback, never votes." },
  { title: "X launch thread", body: "5 to 7 posts, each checked against X's 280-character weighting, with your link in the right place." },
  { title: "LinkedIn post", body: "A launch post with a strong first line and short paragraphs, well under LinkedIn's 3,000-character limit." },
  { title: "3 on-brand images", body: "1200×630 Open Graph, 1600×900 post image and a 1270×760 Product Hunt gallery shot, in your site's colours." },
  { title: "Launch-day checklist", body: "What to post where and when, in order, so launch day is copy, paste, reply." },
] as const;

const faqLimits = resolvedPreviewLimits();

/** The FAQ entry the /faq page expands with sources; see <AdviceSources>. */
export const ADVICE_SOURCES_Q = "Where does the advice come from?";

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
    a: `The product brief, your Product Hunt tagline, the first post of your X thread and three watermarked images. No account or card needed. Free previews work with public repos and live sites, up to ${faqLimits.perHour} an hour and ${faqLimits.perDay} a day.`,
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
    a: "Product Hunt tagline 60 and description 260 characters, X posts 280 (weighted the way X counts them, with links that include http:// or https:// counted as 23) and LinkedIn 3,000. We also cap meta titles at 60 and meta descriptions at 155, but that's LaunchLoop's own choice, not a platform limit. Every limit is checked before you see the kit.",
  },
  {
    q: ADVICE_SOURCES_Q,
    a: `Two places. The limits and rules come from the platforms' own published pages: Product Hunt's ${LIMITS.phTagline}-character tagline, ${LIMITS.phDescription}-character description and three topics, X's ${LIMITS.xPost} characters with links that include http:// or https:// counted as 23, LinkedIn's ${LIMITS.linkedin.toLocaleString("en-GB")} characters, and the Product Hunt and Hacker News rules against asking for upvotes. LaunchLoop puts them in its prompts and checks every draft against them before you see your kit. The copy itself is drafted by AI from your repo and live page, so treat it as a first draft: check the facts and rewrite it in your own words before you post.`,
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
    a: "Ship Loop is a separate tool for after launch, coming soon. It isn't on sale: for now it's a free waitlist, with nothing to buy. Every time you ship a release, it drafts an X post, a LinkedIn post, a changelog blurb and an image in your colours, and emails them to you to approve or edit. It never posts for you. Join the waitlist, we'll email you when it launches.",
  },
] as const;
