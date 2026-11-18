# Source check: Product Hunt or BetaList, 18 November 2026

**URL:** `/blog/product-hunt-vs-betalist`
**Reading time:** recounted by e2e from the rendered post
**Original element:** Same-day dated read log of Product Hunt and BetaList pages on 18 November 2026. LaunchLoop has not been submitted to either board, so this page does not describe a first-hand listing there. The older Launch Guide article `https://help.producthunt.com/en/articles/17350772-launch-guide` returned HTTP 404 on this day; the current guide is the collection and "4. Build your product page".

## Pages fetched 18 November 2026

Product Hunt `www.producthunt.com/launch/*` returned HTTP 403 (Cloudflare challenge) to curl from the box. Those two pages were read the same day via a fetch that returned the live help-centre text (titles "1. How Product Hunt works" and "4. Build your product page", both "Updated over 2 weeks ago", author Juan Francisco Secchi). Help-centre article URLs for unreleased products and upvotes returned HTTP 200 to curl. BetaList pages all returned HTTP 200 to curl. Copies of the curl responses are under `/workspace/seo/launchloop/cmp-src/2026-11-18-ph-vs-betalist/`.

- https://www.producthunt.com/launch/how-product-hunt-works
- https://www.producthunt.com/launch/preparing-for-launch (same article as the help-centre URL below)
- https://help.producthunt.com/en/articles/17834537-4-build-your-product-page
- https://help.producthunt.com/en/collections/19793093-launch-guide
- https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product (HTTP 200; written by Jake Crump, 10 February 2025)
- https://help.producthunt.com/en/articles/484935-can-i-ask-my-community-friends-family-to-upvote-a-product (HTTP 200; written by Jake Crump, 10 February 2025)
- https://betalist.com/help
- https://betalist.com/criteria
- https://betalist.com/agent
- https://betalist.com/boost
- https://betalist.com/submissions/new (`https://betalist.com/submit` redirects here)
- https://help.producthunt.com/en/articles/17350772-launch-guide (HTTP 404 on this day; not quoted)

## Every quote on the page

| Quote | Source | Read |
| --- | --- | --- |
| "Launching costs nothing." | How Product Hunt works | 2026-11-18 |
| "You can submit a product, comment, and reach Product of the Day without spending a cent." | How Product Hunt works | 2026-11-18 |
| "Name (up to 40 characters)" | Build your product page / Preparing for launch | 2026-11-18 |
| "Tagline (up to 60 characters)" | Build your product page / Preparing for launch | 2026-11-18 |
| "Description (up to 500 characters)" | Build your product page / Preparing for launch | 2026-11-18 |
| "You have up to 5,000 characters" | Build your product page, maker comment / first comment | 2026-11-18 |
| "Every launch goes live at 12:01 AM Pacific Time on the day you schedule." | How Product Hunt works | 2026-11-18 |
| "When you schedule, pick a date up to 30 days ahead." | Build your product page / Preparing for launch | 2026-11-18 |
| "We prioritize fully launched products that users can explore and engage with immediately." | Can I submit an unreleased product? | 2026-11-18 |
| "Products that only offer an email sign-up are not eligible for the homepage." | Can I submit an unreleased product? | 2026-11-18 |
| "Company and brand accounts can't submit launches or comment." | How Product Hunt works | 2026-11-18 |
| "Please don't. People should upvote things they genuinely like or find interesting, not because they were peer pressured to do so." | Can I ask my community/friends/family to upvote a product? | 2026-11-18 |
| "All submissions are paid. There is no free submission option." | BetaList Help | 2026-11-18 |
| "Current plans and prices are shown at the end of the submission form." | BetaList Help | 2026-11-18 |
| "If your startup isn't selected, you get a full refund automatically." | BetaList Help | 2026-11-18 |
| "$99/week" | BetaList Boost (Weekly) | 2026-11-18 |
| "$199/month" | BetaList Boost (Monthly) | 2026-11-18 |
| "A pre-launch landing page with a waitlist." | BetaList criteria, "Aim for" | 2026-11-18 |
| "We feature around 20 new startups every day." | BetaList criteria | 2026-11-18 |
| "Each startup gets up to two opportunities to be featured: once pre-launch and once at launch." | BetaList criteria | 2026-11-18 |

## Other facts on the page, not inside `<q>`

- Agent API, 18 November 2026: Lite featured within about 14 days, Standard within about 3 days, Premium within about 1 day. Do not promise a date; declined submissions are refunded.
- BetaList public submit form on 18 November 2026 asked for Website URL and email only; plan prices were not shown at that step.
- How Product Hunt works: the team reviews every launch and hand-picks which ones to feature on the homepage leaderboard; featuring is an editorial decision and meeting the guidelines does not guarantee a spot. Paraphrased from that page, not quoted, because the live sentence is longer.
- Preparing for launch: use a direct link to the homepage, an app store page, or a GitHub repo; skip link shorteners.
- BetaList Help: all plans include a do-follow backlink if featured. Help also states a newsletter subscriber figure; this page does not repeat that figure because we did not count it independently.
- BetaList criteria: a distinct landing page; free hosting subdomains (vercel.app, netlify.app, herokuapp.com) and a direct app-store link in place of a landing page are rejected. The table cell was revised so it does not say "own domain required," which is not the criteria wording.
- BetaList criteria: "There should be at least a few weeks between the two posts so they feel like distinct moments to our audience." This is the gap between a pre-launch feature and a later launch feature. The page paraphrases it; it is not inside a `<q>`.
- Help.producthunt.com article 17350772 returned HTTP 404 on 18 November 2026. The current Launch Guide collection is https://help.producthunt.com/en/collections/19793093-launch-guide.

## Notes

- Boost HTML renders `$99` immediately followed by a `/week` span, so the visible string is `$99/week` (no space). Same pattern for `$199/month`.
- BetaList Help and criteria still contain em dashes in some sentences (for example in the "What is BetaList?" answer). Those sentences are paraphrased on the page so the published copy has no en or em dashes.
- Directory Launch Pack price is taken from `PRODUCTS.directoryPack.priceLabel` (£29).
