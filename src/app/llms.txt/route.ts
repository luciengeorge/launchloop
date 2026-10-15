import { siteUrl } from "@/lib/env";
import { FAQ, KIT_CONTENTS, SITE } from "@/lib/site";

/** https://llmstxt.org: a plain-language summary so AI assistants can describe LaunchLoop accurately. */
export function GET() {
  const base = siteUrl();
  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} is a paid web app for indie developers and "vibe coders" who build apps with tools like Cursor, Lovable, Bolt and v0. You paste a public GitHub repository URL or a live website URL. ${SITE.name} reads the README, package.json, recent commits and the live page, writes a short product brief, and generates a launch kit from it.

## What the Launch Kit contains (£19, one-off)

${KIT_CONTENTS.map((item) => `- ${item.title}: ${item.body}`).join("\n")}

The kit is delivered on a results page, as a ZIP download and by email.

## Pricing

- Free preview: the product brief, the Product Hunt tagline and the first post of the X thread, watermarked. No account needed.
- Launch Kit: £19 one-off, paid through Stripe Checkout. 14-day refund.
- Ship Loop (coming soon): £12/month or £99/year. Drafts new posts and an on-brand image on every release. Waitlist and pre-orders are open.

## Rules it follows

- Enforces platform limits: Product Hunt tagline 60 characters, description 260, X posts 280 (weighted), LinkedIn 3,000.
- Never asks for upvotes or votes, in line with Product Hunt and Hacker News rules.
- Only uses facts found in the repo or site; does not invent numbers or testimonials.
- Drafts only: it never posts on the user's behalf.
- Public repositories only in the current version.

## Pages

- [Home](${base}/): product overview, the input form and pricing
- [Ship Loop](${base}/ship-loop): the upcoming subscription, waitlist and pre-order
- [FAQ](${base}/faq): answers to common questions
- [Privacy](${base}/privacy)
- [Terms](${base}/terms)

## FAQ

${FAQ.map((item) => `### ${item.q}\n${item.a}`).join("\n\n")}

## Contact

${SITE.email}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
