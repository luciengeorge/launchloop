import { GUIDES, guidePath } from "@/lib/guides";
import { LAUNCH_PROMO, PRODUCTS } from "@/lib/products";
import { FAQ, KIT_CONTENTS, SITE, kitPriceLabel, kitPriceText, resolvedPreviewLimits } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

/** `promo` is isLaunchPromoOn(), so the kit price here matches the pages and Checkout. */
export function llmsText(base: string, full: boolean, promo: boolean) {
  const kitPrice = kitPriceLabel(promo);
  const limits = resolvedPreviewLimits();
  const kitPricing = promo
    ? `${kitPrice} (full price ${PRODUCTS.kit.priceLabel}; ${LAUNCH_PROMO.code} is applied at checkout), once, for one app, paid through Stripe Checkout.`
    : `${kitPrice} once, for one app, paid through Stripe Checkout.`;
  const intro = `# ${SITE.name}

> ${SITE.description}

${SITE.name} (${base}) is a paid web app for indie developers and "vibe coders" who build apps with tools like Cursor, Lovable, Bolt and v0. You paste a public GitHub repository URL or a live website URL. ${SITE.name} reads the README, package.json, recent commits and the live page, writes a short product brief, and generates a launch kit from it.

## What the Launch Kit contains (${kitPrice}, one-off)

${KIT_CONTENTS.map((item) => `- ${item.title}: ${item.body}`).join("\n")}

The kit is delivered on a results page, as a ZIP download and by email.

## Pricing (GBP)

- Free preview: the product brief, the Product Hunt tagline, the first post of the X thread and three watermarked images. No account needed. Public repos and live sites only, up to ${limits.perHour} previews an hour and ${limits.perDay} a day.
- Launch Kit: ${kitPricing} Not a subscription. 14-day refund.
- Ship Loop (coming soon, separate from the kit, not on sale): a free waitlist only, with nothing to buy and no price yet. For after launch: drafts an X post, a LinkedIn post, a changelog blurb and an image on every release and emails them to the user to approve or edit. It never posts for the user. Members are emailed if and when it launches.

## Rules it follows

- Enforces platform limits: Product Hunt tagline 60 characters, description 260, X posts 280 (weighted), LinkedIn 3,000.
- Never asks for upvotes or votes, in line with Product Hunt and Hacker News rules.
- Only uses facts found in the repo or site; does not invent numbers or testimonials.
- Drafts only: it never posts on the user's behalf.
- Public repositories only in the current version.

## Pages

- [Home](${base}/): product overview, the input form and pricing
- [Pricing](${base}/pricing): free preview, the ${kitPrice} Launch Kit, the free Ship Loop waitlist
- [Ship Loop](${base}/ship-loop): what Ship Loop will do, and its free waitlist
- [FAQ](${base}/faq): answers to common questions
- [Guides](${base}/guides): every launch guide in one list
- [Free tools](${base}/tools): every free tool in one list
- [Privacy](${base}/privacy)
- [Terms](${base}/terms)

## Free tools

${TOOLS.map((t) => `- [${t.title}](${base}${t.path}): ${t.description}`).join("\n")}

## Guides

${GUIDES.map((g) => `- [${g.title}](${base}${guidePath(g)}): ${g.description}`).join("\n")}
`;
  const tail = full
    ? `
## FAQ

${FAQ.map((item) => `### ${kitPriceText(item.q, promo)}\n\n${kitPriceText(item.a, promo)}`).join("\n\n")}
`
    : `
## Optional

- [Full text for LLMs](${base}/llms-full.txt): this file plus the complete FAQ
`;
  return `${intro}${tail}
## Contact

${SITE.email}
`;
}
