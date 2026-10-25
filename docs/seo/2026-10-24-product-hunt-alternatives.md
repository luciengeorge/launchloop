# Source check: Product Hunt alternatives, 24 October 2026

Blog post for `/blog`, requested on Tuesday 20 October 2026. Every source was read on 20 October 2026 between about 18:40 and 19:15 UTC. Every quote on the page was copied from the fetched page, not from memory or a search snippet, and then checked again by script against saved copies of those pages (see Method). After QA found that Uneed's pages had changed, every price on the page and every Uneed quote were checked again on the live pages on Wednesday 21 October 2026, between about 13:07 and 13:12 UTC (see "Re-check, 21 October 2026"). BetaList then changed its pages, so every BetaList quote and mention was re-checked on Saturday 24 October 2026 against Internet Archive captures made that day between 06:58 and 07:13 UTC (see "BetaList corrections, 24 October 2026").

## Page

**URL:** `/blog/product-hunt-alternatives`
**Title:** `Product Hunt alternatives: where to launch · LaunchLoop` (55 characters)
**Description:** `Sites like Product Hunt, from their own pages: who BetaList, Uneed, Peerlist, DevHunt, Show HN and others are for, what a launch costs and the rules.` (149 characters)
**H1:** Product Hunt alternatives for indie makers. **Published and updated:** 2026-10-24, moved from the brief's 2026-10-22 (bump both in `src/lib/blog.ts` if it merges on another day). **Byline:** Lucien George. **Reading time:** 20 minutes (3,920 words in the rendered body at 200 words a minute after the BetaList corrections, copy fixes and Sources sentence nit of 24 October, 3,916 before the Sources nit, 3,823 before the corrections and 3,745 before the tool links below; the e2e suite recounts it). Recounted on 25 October 2026 from the rendered post the way `tests/e2e/blog.spec.ts` counts (the innerText of `article > div`, split on whitespace): 3,920.

## Target queries

- "product hunt alternatives": US estimate 110 a month, keyword difficulty 0, from OpenSEO, as given in the brief. Not re-queried.
- "sites like product hunt": secondary query from the brief, in the description and the FAQ. No volume was looked up.

The title leads with "Product Hunt alternatives"; the description leads with "Sites like Product Hunt".

## The page we need to beat

LaunchList's guide ranks for the query. It now lives at `https://getlaunchlist.com/blog/product-hunt-alternatives` (the `launchlist.co` URL in the brief returned HTTP 404). It says every platform was "verified active in June 2026". Against the sites' own pages on 20 October 2026, its table is out of date on cost:

| Site | LaunchList's table | The site's own page, 20 October 2026 |
| --- | --- | --- |
| BetaList | "Free queue (paid expedite)" | FAQ: "All submissions are paid. There is no free submission option." |
| DevHunt | "Free" | FAQ: listing is free with a nofollow link; "Launching costs $19 once" |
| Microlaunch | "Free" | The public launch window offers only the paid Pro Launch |
| DevHunt (voting) | "Weekly, GitHub-verified" | FAQ: you sign in with "GitHub or Google" |

Its page also leads with its own waitlist product. Ours differs by quoting each site, giving the date every price was read, flagging where a site's own pages contradict each other (Tiny Startups, Microlaunch's Pro price; BetaList's newsletter figures were flagged too until BetaList made them agree, see "BetaList corrections, 24 October 2026"), and not scoring or ranking the sites. The post doesn't name LaunchList; it says "some lists of Product Hunt alternatives still call BetaList free", which the table above supports (the Nick Launches comparison, `nicklaunches.com/blog/product-hunt-alternative/`, also lists BetaList's free tier as "Free").

## Method

- `curl` with a Chrome user agent read betalist.com, uneed.best, help.uneed.best, devhunt.org, news.ycombinator.com and help.peerlist.io (Mintlify, which also serves each page as `.md`).
- peerlist.io itself returned HTTP 403 to `curl`. Headless Chromium (Playwright) loaded it, but the Launchpad page has no rules text; Peerlist's rules, FAQ and launch guide are on help.peerlist.io, which is where every Peerlist quote comes from.
- microlaunch.net, fazier.com, tinystartups.com and Fazier's Notion help center render in the browser, so they were read with headless Chromium. Microlaunch's FAQ answers open on click and were read by clicking each one. Its "Pick your Launch" window was read by clicking New Launch while signed out. Its "Microlaunch Rules" window couldn't be opened by script, so the rule text was read from the strings in the site's own JavaScript bundle (`/_next/static/chunks/7362-7018eb9828f2678a.js` on 20 October 2026), which is the text that window renders.
- Tiny Startups' submit form only shows its upgrades after you enter a URL and go through four steps. To read it without submitting anything, the upgrade list was read from the form's own JavaScript bundle (`/_next/static/chunks/app/(site)/submit/page-b59f221a9d1a7430.js`, served on 20 October 2026, about 19:44 UTC), which defines the queue-skip item as `"instant-backlink":{amountCents:6900,name:"Instant listing + DR 71+ do-follow backlink",description:"Your free listing skips the queue, launches this week, and its backlink switches to do-follow."}`. The same bundle formats prices as `"£"+Math.round(e/100)`, so 6900 shows as £69. Site QA reported the same item and price on the form itself.
- Fazier and Microlaunch show a crossed-out price next to a lower one. The page's computed styles were checked to see which is crossed out (`text-decoration: line-through`), and the post gives the lower, current price. Fazier was re-checked live at 19:45 UTC on 20 October 2026: Basic "Free" (no crossed-out price), Lite $29 (crossed out $39), Premium $49 (crossed out $69), Super $99 (crossed out $139). The post now says Fazier has a free tier and three paid tiers, each with a crossed-out price, and gives both prices for each.
- Reddit returned HTTP 403 to `curl` and to headless Chromium ("You've been blocked by network security"), and the fetch service timed out. The subreddit text comes from the Internet Archive's copies of the old.reddit rules pages (see Sources), which the page says.
- Indie Hackers' About page was read through the fetch service (Cursor's WebFetch), as for the Indie Hackers post.
- 21 October 2026 re-check: `curl` with a Chrome user agent (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36`) got HTTP 200 and the full server-rendered text from uneed.best/how-it-works, uneed.best/pricing, help.uneed.best's What we accept, betalist.com/advertise, betalist.com/boost, betalist.com/faq, devhunt.org/faq, fazier.com/submit, tinystartups.com/about and /terms, and microlaunch.net/premium. None of them served a Cloudflare challenge. Fazier's and Microlaunch's crossed-out prices were read from the served markup (Fazier's `price-original`, `price-premium-original` and `s-original-price` classes; Microlaunch's `line-through` class). Microlaunch's FAQ answer, which only opens on click, was read from the premium page's own bundle (`/_next/static/chunks/app/premium/page-be4d5ecc7e9635f4.js`), and Tiny Startups' £69 item from the same submit bundle as on 20 October (`page-b59f221a9d1a7430.js`, unchanged).
- Cross-check: after the page was written, a script loaded the rendered post, took every `<q>`, and searched for it in the saved plain-text copies of the sources (whitespace normalised, Markdown link and bold syntax stripped). All 77 quotes were found word for word, with the same apostrophes. The same script confirmed the article has no en or em dashes. Quotes were cut short wherever the source continues with an em dash (BetaList's own-domain rule, Uneed's accept list, Tiny Startups' leaderboard sentence).

## Sites included, and why

Each is in the post because its own pages could be read and say what it is, how to submit, what it costs and what its rules are.

- **DevHunt** (dev tools): FAQ and Advertise page.
- **Show HN** (dev tools, and anything people can try): Show HN guidelines. The page lists no fee, and the post says that rather than calling it free.
- **BetaList** (pre-launch and beta): Help (formerly Support & FAQ), Submission criteria (formerly Submission Guidelines), the submission page, Boost and Advertise, all re-checked on 24 October 2026. Submission prices are only shown at the end of the submission form, so the post doesn't state them.
- **r/alphaandbetausers** (beta): Internet Archive copy, 24 August 2026.
- **Uneed** (general): How it works, Pricing, help center "What we accept".
- **Fazier** (general): Submit page, help center FAQs and launch guide, Terms. Added beyond the brief's examples because LaunchList's page covers it and its pages state tiers and prices clearly.
- **Tiny Startups** (general): About, Submit (including its upgrades step), Terms. Added for the same reason.
- **Microlaunch** (general): Premium page and FAQ, the launch window and the rules window.
- **Peerlist Launchpad** (communities): help center Launchpad pages and Verification.
- **Indie Hackers** (communities): About page; rules are left to our Indie Hackers post.
- **r/SideProject** (communities): Internet Archive copy, 28 August 2026.

## Sites left out, and why

- **AppSumo, X threads, LinkedIn, SaaSHub, AlternativeTo, Launching Next, TinyLaunch.** Out of scope: they are a marketplace, social networks or directories, not launch platforms like the ones in the brief, and the post is already long. Not fetched.
- **r/startups, r/webdev, r/indiehackers.** Not repeated: our Reddit guide quotes their rules, and the post links to it.
- **Product Hunt.** The subject, not an alternative; the post links to our Product Hunt post and checklist.
- **LaunchLoop.** Not a launch platform. The post says so and only mentions what the kit drafts.

No site in the brief had to be dropped for being unreadable. Reddit's live pages couldn't be read, so its two subreddits rest on archive copies, as the page says.

## Gaps the page states instead of guessing

- **BetaList submission prices.** Help, 24 October 2026: "Current plans and prices are shown at the end of the submission form."
- **Microlaunch's free route.** Its launch window, signed out, shows only Pro Launch, which "Skip the queue". Third-party directories (saascity.io, launchdirectories.com, launchto.win) say a free queue exists, but no Microlaunch page we could read says so, so the post doesn't claim it.
- **Peerlist's identity verification fee.** The page says "a minimal fee" (and the identity page "a nominal one-time fee") without an amount.
- **Tiny Startups' Skip the queue price.** £29 on the About page; "Skip the queue £99" in the Terms of Service (effective May 2, 2026); and £69 in the submit form, whose upgrades step offers "Instant listing + DR 71+ do-follow backlink" (`amountCents: 6900`), described as "Your free listing skips the queue, launches this week, and its backlink switches to do-follow." The table says "£29 on its About page; higher in its terms and submit form". The body quotes the £29 and the £69 item, and says the terms list "a higher price" without the figure: `tests/e2e/pricing-consistency.spec.ts` fails any rendered page containing "£99", to keep LaunchLoop's retired £99 Ship Loop pre-order off the site, and that test was left as it is. The terms are linked, so readers can see the figure.
- **Microlaunch's Pro price.** $39 (crossed out at $49, code LAUNCH20, "This Week") on the cards; the FAQ on the same page says "Pro Launch ($49)". The post gives both.
- **The r/SideProject rules list.** The archived rules page shows the sidebar but no numbered rules. The post says so and tells readers to check the live page.

## Paraphrased claims and their sources

- DevHunt launches run for a week, voters are developers, and the platform is open source on GitHub: DevHunt FAQ, "How is DevHunt different from Product Hunt?".
- DevHunt audience, 150K page views a month and 40,000 newsletter subscribers: Advertise on DevHunt.
- Show HN appears on the Show HN new page first and on the show page after a small points threshold; the project must be your own and non-trivial: Show HN guidelines.
- BetaList's "Recently launched", ideally within the last few weeks: Submission criteria, the rest of the "Recently launched" item after its em dash ("ideally within the last few weeks"), 24 October 2026 capture.
- BetaList rules out free hosting subdomains like vercel.app or netlify.app and direct links to app stores: Help, the sentence after "Your startup must have its own domain" ("we don't accept submissions using free hosting subdomains (like vercel.app, netlify.app, herokuapp.com) or direct links to app stores"), 24 October 2026 capture.
- An untouched template, default Bootstrap styles and hosted builders like LaunchRock or Unbounce are common pitfalls; a heavily customized template that no longer looks templated is fine: Submission criteria, "A distinct, decent-looking landing page" ("An untouched free or paid template.", "Default Bootstrap or other off-the-shelf framework styles.", "Hosted landing-page builders (LaunchRock, Unbounce, KickoffLabs, Carrd, etc.)." under "Common pitfalls"; "A heavily customized template, if you started from one, so it no longer looks templated." under "Aim for"), 24 October 2026 capture.
- Blogs, courses, books, newsletters, online stores and agencies are on the pitfalls list: Submission criteria, "A technology startup" ("Blogs, online courses, books, or newsletters.", "Subscription e-commerce or general online stores.", "Consultancies or agencies."), 24 October 2026 capture.
- A signup form, a download button or a social login count, and "Follow us on X to get notified" as the only way to opt in doesn't: Submission criteria, "Visitors can sign up or get access" (the source has the X line in curly quotes followed by "as the only way to opt in."), 24 October 2026 capture.
- BetaList's submission page asks for your website URL and email: `/submit` redirects to `/submissions/new`, whose form fields are "Website URL" and "Your email", 24 October 2026 capture.
- BetaList: payment at checkout, editorial review, decision by email: Help, "What happens after I submit my startup?" (unchanged on 24 October 2026). Boost, $99/week or $199/month, only for featured startups, keeps you on the homepage and in the newsletter: Boost page (unchanged on 24 October 2026: "$99 /week", "$199 /month", "Yes, boosts are available for startups that have been featured on BetaList.").
- Uneed's day leaderboard "resets daily at 12:00 AM PST", and the week, month and year leaderboards are "rolling (sliding windows)": How it works, 21 October 2026. Skip the waiting line is $39.99: How it works ("Skip the waiting line ($39.99)"), Pricing ("Skip the line", "$39.99") and What we accept ("Skip the Waiting Line ($39.99)"), all on 21 October 2026. Fast-track ($14.99) gives a date "around 2 weeks out" and stays published; Relaunch $15; below a score of 10 the product "can't join the free line again": How it works. Uneed's list of what it declines and the NSFW and invite-only exception for paid launches: What we accept. Audience, 125K monthly visitors and 26,000 newsletter subscribers: Pricing.
- Fazier's daily, weekly and monthly leaderboards: the homepage links to `/leaderboard/weekly/...` and `/leaderboard/monthly/...`, and the Lite tier mentions "top 3 daily products". Account and form fields: Fazier launch guide. Tier contents: Submit page.
- Tiny Startups: Monday to Sunday leaderboard and the top-two Product of the Week badge: About. Five-step form: Submit page. Paid upgrades, the credit on rejection, and "real, working products" you own or may promote: Terms. Audience, "20,000+ early adopters" (About) and a newsletter "read by 25k+ startup founders" (Submit).
- Peerlist calls itself a professional network for showing your proof of work: help center `llms.txt` ("Peerlist is a professional network where you can showcase your proof of work, and get hired by the best companies."). What can be launched, the spam examples (including resharing on Scroll), and scheduling a launch ahead: Launchpad FAQ, Rules and Guidelines, and launch guide.
- Indie Hackers' founder's advice to post a launch as a milestone and as a forum post: our Indie Hackers post and its quote log (`2026-10-21-how-to-launch-on-indie-hackers.md`).
- Reddit's site-wide spam rules and per-subreddit self-promotion rules: our Reddit guide and its research note (`2026-10-19-reddit-self-promotion-guide.md`).
- What a LaunchLoop kit drafts (Product Hunt name, tagline, description and maker comment, landing copy, X thread, LinkedIn post and images) from your repo and live page, matching the preview CTA's "Paste your GitHub repo or live URL", and that it doesn't write Show HN, Reddit or Indie Hackers posts: `src/lib/copy.ts` and the preview CTA. The post says these fields are "the same kind of fields boards like Fazier and Peerlist ask for": Fazier's launch guide lists name, tagline, description, category, thumbnail and gallery; Peerlist's rules list product name, tagline, cover image and demo link. The brief asked to say a kit "drafts the copy for these sites"; the post is narrower because the kit doesn't produce site-specific posts.

## Re-check, 21 October 2026

QA found that Uneed's live pages no longer matched the 20 October read. Re-read live on 21 October 2026, about 13:07 to 13:12 UTC, with the method above:

- **Uneed, Skip the waiting line: now $39.99** on How it works ("Skip the waiting line ($39.99): pick the exact date you want."), on Pricing (Skip the line, "$39.99", and "Choose your launch date for free (worth $39.99)" in the Pro plan) and in the help center's What we accept ("Skip the Waiting Line ($39.99)"). The table, the Uneed section and this log now say $39.99. The 20 October price is in this file's git history; `tests/unit/blog.test.ts` and `tests/e2e/blog.spec.ts` fail if it comes back.
- **Uneed, free waiting line: quote #32 replaced.** How it works now says "we assign your launch date automatically, at least 30 days out, at the back of the line." and Pricing says "We assign your launch date, at the back of the line." Neither page gives an upper limit any more, so the table now says "at least 30 days out", the Uneed section quotes the new text, and "Choosing where to launch" says Uneed's free line "is at least 30 days away" instead of giving a maximum wait.
- **Uneed, leaderboards.** The post said all four leaderboards roll. How it works says Product of the Day "resets daily at 12:00 AM PST" and the other three are rolling, so the post now says that.
- **Unchanged on Uneed:** Fast-track $14.99 ("around 2 weeks out", stays published), Relaunch $15, a yearly Pro plan, 125K monthly visitors and 26,000 newsletter subscribers, the moderation rule, the NSFW and invite-only exception ("refused whatever you paid, and we refund you"), and quotes #29 to #31 and #33 to #38, all found word for word.
- **Quotes #19 (BetaList Advertise) and #35 (Uneed Pricing)** were read on the live pages with `curl`. No archive copy was needed.
- **Every other price on the page is unchanged:** DevHunt $19 and $49; BetaList Boost $99 a week or $199 a month; Fazier Basic free, Lite $29 (crossed out $39), Premium $49 (crossed out $69), Super $99 (crossed out $139); Tiny Startups £29 on About and £69 for the submit form's "Instant listing + DR 71+ do-follow backlink"; Microlaunch Launch Pro $39 (crossed out $49) and Launch Plus $79 (crossed out $99), and "Pro Launch ($49)" in its FAQ. That is why the page now says "Prices checked on 21 October 2026." under the table, and the intro gives prices as of 21 October 2026.
- **Not re-read on 21 October:** the non-price quotes from the other sites (DevHunt, Show HN, BetaList FAQ and criteria, Fazier, Tiny Startups, Microlaunch rules, Peerlist, Indie Hackers) and the two subreddit archive copies. They stay dated 20 October 2026 (24 and 28 August for the archives), and the Sources paragraph on the page says so. The FAQ answer about free routes still says "On 20 October 2026", because Microlaunch's signed-out launch window and Peerlist were not reopened.
- **Dates:** published and updated are 2026-10-24 in `src/lib/blog.ts`, which feeds the byline, the BlogPosting JSON-LD, the sitemap and the RSS feed.

## Tool links, 24 October 2026

After publication, the post links LaunchLoop's two free tools, and no other `/tools` path:

- `/tools/product-hunt-tagline-checker` in Fazier's "How to submit", where the launch form asks for a tagline. The copy says it counts against Product Hunt's limit, not Fazier's, and that it flags a repeated name only if you add your product name: the name check is skipped when the optional Product name field is empty (`src/lib/tagline-check.ts`, "`name` is optional; without it the name check is skipped").
- `/tools/og-preview` in r/SideProject's "How to submit", as a check of the page's share image and tags before posting a link. The post makes no claim about how Reddit shows link previews: the tool shows a generic large card (X, LinkedIn, Slack, Facebook and iMessage), not a Reddit preview, and no Reddit source for previews is in this log.
- Both in one sentence at the end of the first "Next steps" paragraph.

No figures were added. `updated` stays 2026-10-24, the day of the change. `tests/e2e/blog.spec.ts` and `tests/unit/blog.test.ts` check both links, where they sit, and that no other `/tools` path is linked.

Copy fixes from QA, 24 October 2026:

- Fazier, tagline checker. Old: "flags hype words, emoji and a repeated product name, and counts it against Product Hunt's limit." New: "counts it against Product Hunt's limit and flags hype words, emoji and, if you add your product name, a repeated name."
- r/SideProject, OG image preview. Old: "A link post can show your page's Open Graph image as its preview, so check what it will show with the free OG image preview." New: "Before you post a link, check your page's share image and tags with the free OG image preview."

## BetaList corrections, 24 October 2026

BetaList changed its pages after this post was written. Arthur approved folding the corrections into the tool links PR (#84). The sibling post on launching on BetaList (PR #62, `docs/seo/2026-10-25-how-to-launch-on-betalist.md` on its branch) re-verified BetaList the same morning, and this post reuses its captures.

**Why captures.** On 24 October BetaList's Cloudflare check returned HTTP 403 with `cf-mitigated: challenge` to direct requests from PR #62's build VM, so its pages were saved through the Internet Archive's Save Page Now between 06:58 and 07:13 UTC. Every BetaList quote on this page was matched word for word against the raw HTML of those captures (`id_` URLs; each capture's `memento-datetime` and `x-archive-orig-date` headers give the fetch time, and `x-archive-orig-server: cloudflare` shows it came from BetaList). From this PR's VM at 07:34 UTC a direct `curl` with a Chrome user agent did get HTTP 200, and `/faq` and `/support` returned 301 redirects to `/help`. Those live pages were used only as a cross-check: every BetaList quote was also found in them.

**Check.** A script took every `<q>` in the rendered article (86, 85 unique) and every BetaList one (18 unique, "Launched months or years ago" twice), plus the curly-quoted "Follow us on X to get notified", and searched for each in plain-text copies of the captures (tags dropped, entities decoded, whitespace normalised). All were found. The article has no en or em dashes. The captures:

| Page | Capture | Captured (UTC) |
| --- | --- | --- |
| https://betalist.com/help | https://web.archive.org/web/20261024070002/https://betalist.com/help | 24 Oct 2026 07:00:02 |
| https://betalist.com/criteria | https://web.archive.org/web/20261024065843/https://betalist.com/criteria | 24 Oct 2026 06:58:43 |
| https://betalist.com/criteria.md | https://web.archive.org/web/20261024070208/https://betalist.com/criteria.md | 24 Oct 2026 07:02:08 |
| https://betalist.com/submit (redirects to `/submissions/new`) | https://web.archive.org/web/20261024071221/https://betalist.com/submissions/new | 24 Oct 2026 07:12:21 |
| https://betalist.com/boost | https://web.archive.org/web/20261024070510/https://betalist.com/boost | 24 Oct 2026 07:05:10 |
| https://betalist.com/advertise | https://web.archive.org/web/20261024070628/https://betalist.com/advertise | 24 Oct 2026 07:06:28 |

**What changed on the page, old then new:**

- Links. `https://betalist.com/faq` ("BetaList FAQ", "BetaList Support & FAQ") is now `https://betalist.com/help` ("BetaList Help page", "BetaList Help"). "Submission Guidelines" is now "Submission criteria", the page's new title. The submission page (`https://betalist.com/submit`) is linked and listed under Sources.
- "Two opportunities". Old: "Each startup gets two opportunities to be featured. Once pre-launch, and once during launch." New: "Each startup gets up to two opportunities to be featured: once pre-launch and once at launch."
- Launch age. Old: "They accept products that are not available to anyone yet, private betas and recent launches, and turn down products launched weeks ago or longer." New: the criteria's own lists, quoted: under "Aim for", "Not yet available to anyone (pre-launch landing page)", "Private beta accessible by invitation only" and "Recently launched", ideally within the last few weeks; under "Common pitfalls", "Launched months or years ago". In Choosing where to launch, old: "BetaList turns down launches that are weeks old or more." New: "BetaList's criteria list "Launched months or years ago" as a common pitfall."
- Old criteria quote "Your product should be recently launched or still be unreleased." is no longer on `/criteria`. Replaced by "BetaList readers come here to discover what's new. If your product has been live for a while or has already had significant press coverage, it's not really news to them anymore."
- Old criteria quote "It's not the right place to promote your blog, newsletter, online store, etc." is no longer on `/criteria`. Replaced by "Our audience comes to BetaList specifically to discover new technology startups." and a paraphrase of the pitfalls list (blogs, courses, books, newsletters, online stores and agencies).
- Newsletter. Old: "It gives two newsletter figures that don't match: 60k+ subscribers on the plan cards, and 70,000+ elsewhere on the same pages." New: "its plan cards offer a "Newsletter slot (70k+ subscribers)"." The plan cards on Advertise and Boost now say 70k+, so the mismatch remark is gone.
- How to submit. Old: "Create an account and fill in the submission form." New: "The submission page asks for your website URL and email: "New here? We create your account on the spot."" (signed-out visitors are no longer sent to a sign-in page).
- Rules list. Own domain: "the guidelines rule out free hosting subdomains like yourapp.vercel.app or yourapp.netlify.app, and direct links to an app store" is now "the Help page rules out free hosting subdomains like vercel.app or netlify.app, and direct links to app stores". Landing page: "on the guidelines' not-accepted list" is now "on the criteria's list of common pitfalls", and "A heavily customised template that looks original is fine." is now "A heavily customized template that no longer looks templated is fine." Sign-up: "Follow us on X to get notified" now carries the source's "as the only way to opt in".
- FAQ answers (also in the FAQPage JSON-LD). "BetaList's FAQ says all submissions are paid" is now "BetaList's Help page says all submissions are paid". "its guidelines accept products that are not available to anyone yet" is now "its submission criteria welcome products that are not yet available to anyone".
- Sources paragraph: adds that BetaList's pages were checked again on 24 October 2026 from Internet Archive copies saved that day.

**Unchanged.** The "Free or paid, at a glance" row for BetaList ("None: all submissions are paid"; "Plans shown only in the submission form; Boost $99/week or $199/month after you are featured") still matches: Help and the Boost page ("$99 /week", "$199 /month"). It never gave a subscriber figure. The Free or paid paragraph's Help quotes and the "What is BetaList?" quote are unchanged word for word, only moved from `/faq` to `/help`.

**Pricing.** The post gives only BetaList's Boost prices, which are unchanged. The Advertise page's other tiers, Sponsorship ($4,999/month) and Premium ($9,999/month), are advertising, not a way to launch, and are left out as before, so no figure was added. No e2e test checks allowed BetaList figures for this post (PR #62's pricing test covers its own post).

**Tests.** `tests/e2e/blog.spec.ts` expects the `/help` and `/criteria` links and the new quotes, and fails if the page or its JSON-LD has `/faq` or `/support` links, "60k", the old two-opportunities and launch-age wording, the two retired criteria quotes, "BetaList FAQ" or "don't match". `tests/unit/blog.test.ts` checks the source for the `/help` URL and no `/faq`, `/support` or "60k".

## Sources

- DevHunt FAQ: https://devhunt.org/faq
- Advertise on DevHunt: https://devhunt.org/advertise
- Show HN guidelines: https://news.ycombinator.com/showhn.html
- BetaList Help (`/faq` and `/support` now redirect here): https://betalist.com/help (capture `https://web.archive.org/web/20261024070002/https://betalist.com/help`)
- BetaList Submission criteria: https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`; Markdown copy `https://web.archive.org/web/20261024070208/https://betalist.com/criteria.md`)
- BetaList, Submit your startup: https://betalist.com/submit, which redirects to `/submissions/new` (capture `https://web.archive.org/web/20261024071221/https://betalist.com/submissions/new`)
- BetaList Boost: https://betalist.com/boost (capture `https://web.archive.org/web/20261024070510/https://betalist.com/boost`)
- Advertise on BetaList: https://betalist.com/advertise (capture `https://web.archive.org/web/20261024070628/https://betalist.com/advertise`)
- r/alphaandbetausers rules, Internet Archive copy of 24 August 2026: https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ (linked on the page as the source, next to a link to the live subreddit, https://www.reddit.com/r/alphaandbetausers/)
- Uneed, How it works: https://www.uneed.best/how-it-works
- Uneed, Pricing: https://www.uneed.best/pricing
- Uneed Help Center, What we accept (and what we don't): https://help.uneed.best/common-questions-and-issues/what-we-accept
- Fazier, Submit Product: https://fazier.com/submit
- Fazier Help Center, FAQs: https://falakdigital.notion.site/FAQs-8e4b805abeef4343ba0ae528d32ab292
- Fazier Help Center, Launch guide: https://falakdigital.notion.site/Launch-guide-91568ec42751411d8050f1474121e7f8
- Fazier, Terms & Conditions: https://fazier.com/terms-of-service
- Tiny Startups, About: https://www.tinystartups.com/about
- Tiny Startups, Launch a startup: https://www.tinystartups.com/submit (upgrades step read from its JavaScript bundle, see Method)
- Tiny Startups, Terms of Service (effective May 2, 2026): https://www.tinystartups.com/terms
- Microlaunch Premium, with its FAQ: https://microlaunch.net/premium
- Microlaunch homepage, "Pick your Launch" and "Microlaunch Rules" windows: https://microlaunch.net/
- Peerlist Help Center, What is Peerlist Launchpad?: https://help.peerlist.io/individual/launchpad/introduction
- Peerlist Help Center, Launchpad Rules and Guidelines: https://help.peerlist.io/individual/launchpad/guidelines-faqs
- Peerlist Help Center, How do I launch a project on Peerlist Launchpad?: https://help.peerlist.io/individual/launchpad/how-to-launch-a-project-on-peerlist-launchpad
- Peerlist Help Center, Launchpad FAQ: https://help.peerlist.io/individual/launchpad/frequently-asked-questions-about-spotlight-by-peerlist
- Peerlist Help Center, Verification: https://help.peerlist.io/individual/peerlist-profile/verification
- About Indie Hackers: https://www.indiehackers.com/about
- r/SideProject rules, Internet Archive copy of 28 August 2026: https://web.archive.org/web/20260828184531/https://old.reddit.com/r/SideProject/about/rules (linked on the page as the source, next to a link to the live subreddit, https://www.reddit.com/r/SideProject/)

## Every quote on the page

| # | Quote (verbatim) | Source |
| --- | --- | --- |
| 1 | "DevHunt is a launchpad for developer tools, built by developers." | https://devhunt.org/faq |
| 2 | "Tools for developers" | https://devhunt.org/faq |
| 3 | "Sign in, open your account and submit your tool with its name, website, description, logo and screenshots." | https://devhunt.org/faq |
| 4 | "Listing a tool is free: every tool gets a permanent page with a nofollow link. Launching costs $19 once: you choose the launch week, get a spot in the newsletter, and your link becomes dofollow." | https://devhunt.org/faq |
| 5 | "For $49 the launch is boosted: on equal votes it is listed above other launches, on the site and in the weekly email, and gets its own post on X." | https://devhunt.org/faq |
| 6 | "Tools that are not for developers, NSFW tools, and services that sell fake engagement are not accepted." | https://devhunt.org/faq |
| 7 | "You have to sign in (GitHub or Google) to vote or comment, which keeps the votes from real people." | https://devhunt.org/faq |
| 8 | "Show HN is for something you've made that other people can play with." | https://news.ycombinator.com/showhn.html |
| 9 | "To post, submit a story whose title begins with "Show HN"." | https://news.ycombinator.com/showhn.html |
| 10 | "blog posts, sign-up pages, newsletters, lists, and other reading material" | https://news.ycombinator.com/showhn.html |
| 11 | "Don't post quickly-generated one-offs; anybody can do that now." | https://news.ycombinator.com/showhn.html |
| 12 | "Please don't ask friends to upvote or comment. That's not ok on HN." | https://news.ycombinator.com/showhn.html |
| 13 | "BetaList is the place for early adopters to discover upcoming and recently launched internet startups, and for startup founders to share their startup with the world and get early user feedback." | https://betalist.com/help (capture `https://web.archive.org/web/20261024070002/https://betalist.com/help`, 24 Oct 2026 07:00:02 UTC; unchanged, moved from `/faq`) |
| 14 | "BetaList readers come here to discover what's new. If your product has been live for a while or has already had significant press coverage, it's not really news to them anymore." | https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`, 24 Oct 2026 06:58:43 UTC; new) |
| 15 | "Aim for" | https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`, 24 Oct 2026 06:58:43 UTC; new, a list heading) |
| 16 | "Not yet available to anyone (pre-launch landing page)" | https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`, 24 Oct 2026 06:58:43 UTC; new, replaces "Not available to anyone yet") |
| 17 | "Private beta accessible by invitation only" | https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`, 24 Oct 2026 06:58:43 UTC; unchanged wording, now quoted) |
| 18 | "Recently launched" | https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`, 24 Oct 2026 06:58:43 UTC; stops at the em dash before "ideally within the last few weeks") |
| 19 | "Common pitfalls" | https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`, 24 Oct 2026 06:58:43 UTC; new, a list heading) |
| 20 | "Launched months or years ago" | https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`, 24 Oct 2026 06:58:43 UTC; new, replaces "Launched weeks ago or longer"; quoted twice, in the BetaList section and in Choosing where to launch) |
| 21 | "New here? We create your account on the spot." | https://betalist.com/submit (redirects to `/submissions/new`) (capture `https://web.archive.org/web/20261024071221/https://betalist.com/submissions/new`, 24 Oct 2026 07:12:21 UTC; new) |
| 22 | "All submissions are paid. There is no free submission option." | https://betalist.com/help (capture `https://web.archive.org/web/20261024070002/https://betalist.com/help`, 24 Oct 2026 07:00:02 UTC; unchanged, moved from `/faq`) |
| 23 | "Current plans and prices are shown at the end of the submission form." | https://betalist.com/help (capture `https://web.archive.org/web/20261024070002/https://betalist.com/help`, 24 Oct 2026 07:00:02 UTC; unchanged, moved from `/faq`) |
| 24 | "If your startup isn't selected, you get a full refund automatically." | https://betalist.com/help (capture `https://web.archive.org/web/20261024070002/https://betalist.com/help`, 24 Oct 2026 07:00:02 UTC; unchanged, moved from `/faq`) |
| 25 | "differ mainly by how quickly your startup is featured and whether newsletter inclusion is guaranteed." | https://betalist.com/help (capture `https://web.archive.org/web/20261024070002/https://betalist.com/help`, 24 Oct 2026 07:00:02 UTC; unchanged, moved from `/faq`) |
| 26 | "Promote your product to startup founders and early adopters" | https://betalist.com/advertise (capture `https://web.archive.org/web/20261024070628/https://betalist.com/advertise`, 24 Oct 2026 07:06:28 UTC; unchanged) |
| 27 | "Newsletter slot (70k+ subscribers)" | https://betalist.com/advertise (capture `https://web.archive.org/web/20261024070628/https://betalist.com/advertise`, 24 Oct 2026 07:06:28 UTC; new, replaces the 60k+ versus 70,000+ remark; also on the Boost capture `https://web.archive.org/web/20261024070510/https://betalist.com/boost`, 24 Oct 2026 07:05:10 UTC) |
| 28 | "Your startup must have its own domain" | https://betalist.com/help (capture `https://web.archive.org/web/20261024070002/https://betalist.com/help`, 24 Oct 2026 07:00:02 UTC; unchanged, moved from `/faq`; stops at the em dash) |
| 29 | "Our audience comes to BetaList specifically to discover new technology startups." | https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`, 24 Oct 2026 06:58:43 UTC; new, replaces "It's not the right place to promote your blog, newsletter, online store, etc.") |
| 30 | "Each startup gets up to two opportunities to be featured: once pre-launch and once at launch." | https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`, 24 Oct 2026 06:58:43 UTC; new, replaces "Each startup gets two opportunities to be featured. Once pre-launch, and once during launch.") |
| 31 | "Our innovators need people to use their products and give them feedback!" | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 32 | "Please tag title with stage and system, i.e., [Android, Alpha] or [IOS, Beta]" | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 33 | "Please add a description of your product" | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 34 | "Posts must include links to products that are ready to be tested" | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 35 | "DO NOT post links to pages that only request email addresses or "registration for launch" or "apply here" for future testing. These will be removed." | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 36 | "If you are posting, please take the time to test someone else's product as well." | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 37 | "Uneed is a social launchpad for tech products." | https://www.uneed.best/how-it-works; https://www.uneed.best/pricing |
| 38 | "Every day at 12:00 AM PST, a new batch of products goes live on the homepage" | https://www.uneed.best/how-it-works |
| 39 | "Submitting is not scheduling." | https://www.uneed.best/how-it-works |
| 40 | "at least 30 days out, at the back of the line." | https://www.uneed.best/how-it-works (read live on 21 October 2026; replaces the earlier quote, which is no longer on the page) |
| 41 | "Your launch needs an upvote score of 10 on launch day to stay published, and 20 to keep a do-follow backlink." | https://www.uneed.best/how-it-works |
| 42 | "pick the exact date you want. Published with a do-follow backlink for life, no minimum upvote score." | https://www.uneed.best/how-it-works (re-read live on 21 October 2026, after "Skip the waiting line ($39.99):") |
| 43 | "mostly made of founders, indie hackers, tech enthusiasts" | https://www.uneed.best/pricing (re-read live on 21 October 2026: `curl`, HTTP 200, no Cloudflare challenge) |
| 44 | "Free submissions go through moderation and can be declined, most often because they fall into a category we already receive dozens of every week. Paid launches are never declined." | https://www.uneed.best/how-it-works |
| 45 | "Our reviewers need to be able to actually try your product." | https://help.uneed.best/common-questions-and-issues/what-we-accept |
| 46 | "Don't buy votes: we detect it, the votes get removed, and repeat offenders get banned." | https://www.uneed.best/how-it-works |
| 47 | "Find your next favorite product or submit your own." | https://fazier.com/submit |
| 48 | "Give your product the spotlight it deserves. Start free or go premium for maximum visibility." | https://fazier.com/submit |
| 49 | "Reviewed & listed within 30 days" | https://fazier.com/submit |
| 50 | "A backlink to our site is required (on your homepage or footer)" | https://fazier.com/submit |
| 51 | "there must be 6 months gap between launches and your product is improved considerably." | https://falakdigital.notion.site/FAQs-8e4b805abeef4343ba0ae528d32ab292 |
| 52 | "Content must be accurate, not misleading, not obscene, libelous, hateful, or infringing on any rights." | https://fazier.com/terms-of-service |
| 53 | "Tiny Startups is a startup launch platform, startup directory, and Product Hunt alternative built for indie makers." | https://www.tinystartups.com/about |
| 54 | "Launches compete on a weekly leaderboard" | https://www.tinystartups.com/about |
| 55 | "Every listing is hand-approved." | https://www.tinystartups.com/about |
| 56 | "Launching is free; Skip the queue (£29) puts you in the next Monday batch" | https://www.tinystartups.com/about |
| 57 | "Instant listing + DR 71+ do-follow backlink" | https://www.tinystartups.com/submit (upgrades step, from the form's JavaScript bundle) |
| 58 | "Your free listing skips the queue, launches this week, and its backlink switches to do-follow." | https://www.tinystartups.com/submit (upgrades step, from the form's JavaScript bundle) |
| 59 | "All sales are final. We do not offer refunds." | https://www.tinystartups.com/terms |
| 60 | "Free submissions enter a review queue and are not guaranteed to be approved or given a specific launch date." | https://www.tinystartups.com/terms |
| 61 | "Rank is upvotes, nothing else: clicks and reviews never move a listing." | https://www.tinystartups.com/about |
| 62 | "Artificial inflation of votes (bots, purchased votes, coordinated campaigns) is prohibited and will result in removal and account suspension." | https://www.tinystartups.com/terms |
| 63 | "Microlaunch is where makers launch and grow their products." | https://microlaunch.net/premium (FAQ) |
| 64 | "Your launch campaign runs for 30 days, during which your product is showcased to our community of Tech Makers from around the world." | https://microlaunch.net/premium (FAQ) |
| 65 | "Skip the queue, go Live Now or Schedule" | https://microlaunch.net/ ("Pick your Launch" window) |
| 66 | "OSS Projects & Students, get 50% OFF Now." | https://microlaunch.net/ ("Pick your Launch" window) |
| 67 | "Products rank over 1 month" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 68 | "Products are onboarded between the 1st-15th" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 69 | "Only signed users can vote" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 70 | "Makers can submit multiple products, with a maximum of two ranking per month." | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 71 | "No bots allowed on the platform" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 72 | "Roasts tend to lower your product score while increasing your final rank" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 73 | "Launch window opens on Monday every week!" | https://help.peerlist.io/individual/launchpad/introduction |
| 74 | "Anyone with a Verified Peerlist profile can launch their products on Peerlist Launchpad." | https://help.peerlist.io/individual/launchpad/frequently-asked-questions-about-spotlight-by-peerlist |
| 75 | "Only projects that are 100% complete are eligible for launching on Launchpad." | https://help.peerlist.io/individual/launchpad/how-to-launch-a-project-on-peerlist-launchpad |
| 76 | "Workplace verification is free. Identity verification has a minimal fee associate with it." | https://help.peerlist.io/individual/peerlist-profile/verification |
| 77 | "We have zero tolerance for spamming." | https://help.peerlist.io/individual/launchpad/guidelines-faqs |
| 78 | "Only individual profiles are allowed to launch projects." | https://help.peerlist.io/individual/launchpad/guidelines-faqs |
| 79 | "SEO marketing agencies are strictly prohibited from launching projects on behalf of their clients or customers." | https://help.peerlist.io/individual/launchpad/guidelines-faqs |
| 80 | "For first 2 days (Monday and Tuesday), the projects are in random order to give equal exposure to all the projects launched." | https://help.peerlist.io/individual/launchpad/frequently-asked-questions-about-spotlight-by-peerlist |
| 81 | "No, only the top 5 projects of the week are awarded a backlink." | https://help.peerlist.io/individual/launchpad/frequently-asked-questions-about-spotlight-by-peerlist |
| 82 | "Indie Hackers is a place where the founders of profitable businesses and side projects can share their stories transparently, and where entrepreneurs can come to read and learn from those examples." | https://www.indiehackers.com/about |
| 83 | "You're an indie hacker if you've set out to make money independently." | https://www.indiehackers.com/about |
| 84 | "Welcome to r/SideProject, a subreddit for sharing and receiving constructive feedback on side projects." | https://web.archive.org/web/20260828184531/https://old.reddit.com/r/SideProject/about/rules |
| 85 | "When submitting a link to a project or startup, please use this format: [Project name] - [Short description]." | https://web.archive.org/web/20260828184531/https://old.reddit.com/r/SideProject/about/rules |
