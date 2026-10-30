import { postPath } from "./blog";
import { KIT_PRICE_TOKEN } from "./site";

export type Tool = {
  path: string;
  title: string;
  metaTitle: string;
  description: string;
  imageAlt: string;
  updated: string;
};

export const TAGLINE_CHECKER: Tool = {
  path: "/tools/product-hunt-tagline-checker",
  title: "Product Hunt tagline checker",
  metaTitle: "Product Hunt Tagline Checker (60 chars)",
  description:
    "Free Product Hunt tagline checker: live 60-character count and tips, or generate 3 taglines from your GitHub repo. Then get the full launch kit.",
  imageAlt: "Product Hunt tagline checker by LaunchLoop: live 60-character count, checklist and feed preview",
  updated: "2026-10-15",
};

export const OG_PREVIEW: Tool = {
  path: "/tools/og-preview",
  title: "OG image preview",
  metaTitle: "OG Image Preview & Checker (1200×630)",
  description:
    "Free OG preview: paste a URL to see its Open Graph card, check the share image is 1200×630 and fix missing tags. No sign-up. Then get the full launch kit.",
  imageAlt: "OG image preview by LaunchLoop: a link card at 1200×630 with a checklist of Open Graph tags",
  updated: "2026-10-26",
};

export const SHOW_HN_CHECKER: Tool = {
  path: "/tools/show-hn-title-checker",
  title: "Show HN title checker",
  metaTitle: "Show HN Title Checker: Test Against HN Rules",
  description:
    "Free Show HN title checker: test your title and first comment against Hacker News's own rules, each quoted and linked to its source. No AI, no sign-up.",
  imageAlt: "Show HN title checker by LaunchLoop: a title checked against Hacker News's own rules, each one quoted",
  updated: "2026-10-27",
};

export const TOOLS: Tool[] = [TAGLINE_CHECKER, OG_PREVIEW, SHOW_HN_CHECKER];

export const TAGLINE_FAQ = [
  {
    q: "How long can a Product Hunt tagline be?",
    a: "60 characters, including spaces and punctuation. The checker counts as you type and marks anything over 60 as a fail, so you know exactly how much to cut before you paste it into Product Hunt.",
  },
  {
    q: "What makes a good Product Hunt tagline?",
    a: "It says what the product does and who it is for, in plain words. Lead with the outcome, skip hype like “AI-powered”, “revolutionary” or “seamless”, leave off the trailing full stop and emoji, and don't repeat the product name, because Product Hunt already shows it right above the tagline.",
  },
  {
    q: "Does this tool rewrite my tagline?",
    a: "No. Check mode only scores what you type and explains each flag, so your wording stays yours. If you want fresh options, Generate mode writes three from your repo or site, and you can check each one with a click.",
  },
  {
    q: "Can I generate a tagline from my GitHub repo?",
    a: "Yes. Paste a public GitHub repo or your live URL and LaunchLoop reads the README, package.json, recent commits and landing page, then writes three taglines of 60 characters or fewer. It is the same engine as the LaunchLoop free preview.",
  },
  {
    q: "Is the checker free?",
    a: `Yes. Checking is free with no sign-up, as many times as you like, and runs in your browser. Generating taglines is free too, within the same hourly allowance as the free preview. The full launch kit, with the rest of your Product Hunt post, X thread, LinkedIn post and images, is ${KIT_PRICE_TOKEN}.`,
  },
] as const;

/** A tool FAQ answer, optionally ending with a link to the page that covers the question in full. */
export type ToolFaqItem = { q: string; a: string; more?: { href: string; label: string } };

export const OG_FAQ: readonly ToolFaqItem[] = [
  {
    q: "What size should an Open Graph image be?",
    a: "Use 1200×630 pixels as a PNG or JPG under 5 MB: it's the size Facebook recommends and it meets LinkedIn's 1200×627 minimum, though X's archived docs describe a 2:1 image and Slack publishes no size.",
    more: { href: postPath({ slug: "og-image-size" }), label: "See what each platform's docs say." },
  },
  {
    q: "Why isn't my link showing a preview image?",
    a: "Check five things: that there's an og:image tag, that its URL is a full https:// address rather than a relative one, that the image is a PNG or JPG (some platforms don't accept SVG), that the page and image load without a login and the platform's crawler isn't blocked, and that the app hasn't cached an old version. Paste the URL above and the checklist tells you which one it is.",
  },
  {
    q: "Why does my card look different on X, LinkedIn and Slack?",
    a: "Each app crops and trims in its own way. X needs twitter:card set to summary_large_image for the full-width image, LinkedIn and Slack cut long titles after a line or two, and every app caches what it saw the first time. The preview here shows the common large card, which is the layout all of them are based on.",
  },
  {
    q: "Does this tool make an OG image for me?",
    a: `No, it reads the tags and the image you already have and tells you what to fix. If you want one made, LaunchLoop reads your README, package.json, recent commits and live site and renders a 1200×630 OG image in your brand colours, along with the X and Product Hunt images and your launch copy. The free preview shows watermarked versions of all three; the full kit is ${KIT_PRICE_TOKEN}.`,
  },
  {
    q: "Is the OG preview free?",
    a: "Yes, with no sign-up and no card. It fetches the public page and its share image the way a link previewer would, as LaunchLoopBot, and doesn't save the URL or the results.",
  },
];

export const SHOW_HN_FAQ: readonly ToolFaqItem[] = [
  {
    q: "How long can a Show HN title be?",
    a: "HN's submit form rejects titles longer than 80 characters, even though the written guidelines don't mention it. The Show HN guidelines, the main guidelines and the FAQ give no length. The limit comes from HN's published news.arc source, and HN's live code isn't public, so check the form if you're near it. This tool shows the count, and adds a separate submit form check when your title is over 80, not as an HN rule. Aim for a title that says what the project is in one short line.",
  },
  {
    q: "What should a Show HN title start with?",
    a: "With \"Show HN\". The Show HN guidelines say to submit a story whose title begins with \"Show HN\". After that, say plainly what the project is, without capitals, exclamation points or claims about how great it is, which the HN guidelines ask titles to avoid.",
    more: { href: "/how-to-write-a-show-hn-post#title", label: "See weak and stronger titles." },
  },
  {
    q: "Can I ask people to upvote or comment on my Show HN?",
    a: "No. The Show HN guidelines say not to ask friends to upvote or comment, the HN guidelines say not to solicit upvotes, comments or submissions, and the HN FAQ says HN penalises or bans submissions, accounts and sites that break this rule. The checker doesn't flag asking for feedback, because the Show HN guidelines expect readers to give feedback in the thread.",
    more: { href: "/show-hn-launch-checklist#voting", label: "Read the voting rules in full." },
  },
  {
    q: "Does the checker use AI or save what I type?",
    a: "No. The checks are plain pattern rules that run in your browser, so your title and text aren't sent to LaunchLoop or saved. The page loads the site's usual analytics, which don't record what you type into the form.",
  },
  {
    q: "Why does it flag something that's fine in my title?",
    a: "The checks look for patterns, such as an all-caps word, a number before a plural or a version number, and can't know what you meant. An acronym or a meaningful number is fine: HN's own guidelines give \"The 5 Platonic Solids\" as an example of a number worth keeping. Treat a warning as a prompt to look again, not a ban.",
  },
];
