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
    "Free Product Hunt tagline checker: live 60-character count and tips, or generate 3 taglines from your GitHub repo. Then get the full £19 launch kit.",
  imageAlt: "Product Hunt tagline checker by LaunchLoop: live 60-character count, checklist and feed preview",
  updated: "2026-10-15",
};

export const OG_PREVIEW: Tool = {
  path: "/tools/og-preview",
  title: "OG image preview",
  metaTitle: "OG Image Preview & Checker (1200×630)",
  description:
    "Free OG preview: paste a URL to see its Open Graph card, check the share image is 1200×630 and fix missing tags. No sign-up. Then get the full £19 launch kit.",
  imageAlt: "OG image preview by LaunchLoop: a link card at 1200×630 with a checklist of Open Graph tags",
  updated: "2026-10-15",
};

export const TOOLS: Tool[] = [TAGLINE_CHECKER, OG_PREVIEW];

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
    a: "Yes. Checking is free with no sign-up, as many times as you like, and runs in your browser. Generating taglines is free too, within the same hourly allowance as the free preview. The full launch kit, with the rest of your Product Hunt post, X thread, LinkedIn post and images, is £19.",
  },
] as const;

export const OG_FAQ = [
  {
    q: "What size should an Open Graph image be?",
    a: "1200×630 pixels, a 1.91:1 ratio, as a PNG or JPG. Keep it under 1 MB if you can and well under 5 MB, which is where X stops showing images. Anything smaller than 600×315 is shown as a small thumbnail or not at all, and keep your headline away from the edges because some apps crop a little.",
  },
  {
    q: "Why isn't my link showing a preview image?",
    a: "Usually one of five things: there's no og:image tag, the image URL is relative instead of a full https:// address, the image is an SVG, the page or image needs a login or blocks crawlers, or the app cached an old version. Paste the URL above and the checklist tells you which one it is.",
  },
  {
    q: "Why does my card look different on X, LinkedIn and Slack?",
    a: "Each app crops and trims in its own way. X needs twitter:card set to summary_large_image for the full-width image, LinkedIn and Slack cut long titles after a line or two, and every app caches what it saw the first time. The preview here shows the common large card, which is the layout all of them are based on.",
  },
  {
    q: "Does this tool make an OG image for me?",
    a: "No, it reads the tags and the image you already have and tells you what to fix. If you want one made, LaunchLoop reads your repo and live site and renders a 1200×630 OG image in your brand colours, along with the X and Product Hunt images and your launch copy. The free preview shows a watermarked version; the full kit is £19.",
  },
  {
    q: "Is the OG preview free?",
    a: "Yes, with no sign-up and no card. It fetches the public page and its share image the way a link previewer would, as LaunchLoopBot, and doesn't save the URL or the results.",
  },
] as const;
