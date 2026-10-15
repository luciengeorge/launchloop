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

export const TOOLS: Tool[] = [TAGLINE_CHECKER];

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
