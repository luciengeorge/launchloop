# Source check: how to launch on BetaList, 25 October 2026

Blog post requested on Wednesday 21 October 2026 and first sourced that day. QA found that BetaList had changed several pages after 21 October, so every source was read again on Saturday 24 October 2026 from about 06:58 to 07:13 UTC and the post was rewritten to match. Every quote on the page was copied from a page read that day, not from memory or a search snippet, and then checked again by script (see Method). On Sunday 25 October 2026 a comparison table and a readiness checklist were added, every BetaList page was read live again, and the table's other sites were read on their own pages (see "Comparison table and checklist, 25 October 2026").

## Page

**URL:** `/blog/how-to-launch-on-betalist`
**Title:** `How to launch on BetaList: submission guide · LaunchLoop` (56 characters)
**Description:** `How to launch on BetaList from its own pages: who it is for, what it rejects, how submission and paid plans work, review times and the day you are featured.` (156 characters)
**H1:** How to launch on BetaList. **Published and updated:** 2026-10-25, moved from the brief's 2026-10-23 (bump both in `src/lib/blog.ts` if it merges on another day). **Byline:** Lucien George. **Reading time:** 23 minutes (4,571 words in the rendered body at 200 words a minute after the comparison table and checklist of 25 October, 3,617 before them; the e2e suite recounts it). Published and updated stay 2026-10-25: the 25 October additions are on the publish day, so there is no later updated date to set.

Target queries: "how to launch on betalist" and "betalist submission". No keyword lookups were made for this post.

## Re-verified 24 October 2026: what changed

- **`/criteria` was rewritten** as "Submission criteria" (also published as plain Markdown at `/criteria.md`). Its five sections now each have an "Aim for" list and a "Common pitfalls" list. 28 old quotes no longer matched, 27 from the old guidelines and 1 from the landing page guide (old 46, see below), and all of them were replaced with the new wording. The "Fits" and "Doesn't" labels became "Aim for" and "Common pitfalls", now used in all five sections, because the new page has both lists under every section. The old paraphrase "in red beneath it" was dropped: the lists are no longer red text, only their icons differ.
- **`/criteria` now says "We feature around 20 new startups every day."** The post quotes it on the featured day, and "how many startups are featured each day" is no longer listed as a gap.
- **`/support` and `/faq` now redirect to `/help`** (title "Help"). The answers quoted from the old FAQ are unchanged word for word on `/help`, so those quotes stay; the links, the source URLs and the name ("the Help page" instead of "the FAQ") were updated.
- **New `/help/submitting` page** ("How to write a great submission") goes through the form field by field and says "Most submissions wait days or weeks before publishing, so dated offers often expire before they go live." The form fields and a rough wait are no longer listed as gaps.
- **New `/agent` page** ("Agent API"), linked from the submission page, publishes the plan names and rough featuring times ("Lite: featured within about 14 days. Standard: featured within about 3 days. Premium: featured within about 1 day.") and each field's limit, which it says follow "the web form's rules and messages". Plan names, review times by plan and field limits are no longer listed as gaps. Prices are still not public: the page says "prices are shown when the founder picks one".
- **`/submit` no longer sends a signed-out visitor to the sign-in page.** It now opens `/submissions/new`, which asks for your website URL and email ("New here? We create your account on the spot.") or offers "Submit with your agent". The steps were rewritten and the Help page's sign-up step (old quote 50) was dropped.
- **Landing page guide:** "The sign up form should be front and center." now reads "The signup form should be front and center." Quote updated. The new `/criteria` no longer links the guide; the post now just calls it BetaList's guide.
- **Advertise page:** the plan cards now say 70k+ subscribers, not 60k+, and there is a new advertising tier, Premium, at $9,999/month. The pricing section and its e2e test (allowed dollar figures) were updated.
- **Unchanged on 24 October:** the Help answers quoted from the old FAQ, the Submission Terms, the Boost page (still $99/week and $199/month, "Introductory pricing"), the homepage line, and the rest of the landing page guide.
- **Counts:** 116 `<q>` quotes on the page (115 unique; "Current plans and prices are shown at the end of the submission form." appears twice). 57 are unchanged from the 21 October log and 58 are new. All 116 matched by script, and there are no en or em dashes. Of the 89 unique quotes in the 21 October log, 28 no longer matched (27 criteria, 1 landing guide); recounted on 25 October 2026 by searching each of the 89 in plain-text copies of BetaList's live pages, which found the same 28.
- **Correction, 25 October 2026: the landing page guide capture.** The capture listed below for the landing page guide (`20261024070656`) does not hold a 24 October copy: the Internet Archive redirects it to its copy of 12 July 2026 (`memento-datetime: Sun, 12 Jul 2026 05:56:45 GMT`), which still says "The sign up form". The new wording (quote 55) was confirmed on the live page on 25 October 2026 at 07:50 UTC, which says "The signup form should be front and center."; the old wording is no longer on it. The other twelve captures below are genuine 24 October copies (each `memento-datetime` checked on 25 October).

## Method

- `curl` with a Chrome user agent no longer gets through on 24 October: every betalist.com and guides.betalist.com URL returned HTTP 403 with `cf-mitigated: challenge` (a Cloudflare "Just a moment..." page) from the build VM. Headless and headed Chromium got the same challenge, and the system Chrome got a "Verify you are human" check, which was not clicked.
- So each page was read live through the Internet Archive's Save Page Now, which fetched it from BetaList on 24 October 2026, and the raw HTML of that capture (`id_` URLs, listed under Sources) was used as the plain-text copy. The capture response headers carry BetaList's own Cloudflare headers and the original fetch time.
- Cross-check: the same pages were also read live with a remote fetcher (Cursor WebFetch) for `/criteria`, `/criteria.md`, `/help`, `/help/submitting`, `/support`, `/faq` and the homepage. Its text agreed with the captures. `/support` and `/faq` both returned the Help page.
- A script took every `<q>` from the rendered article (116 quotes, 115 unique), decoded the entities, normalised whitespace, and searched for each one in plain-text copies of the captures. Tags were dropped so that inline links and code spans don't split sentences. All 116 were found word for word, with BetaList's straight apostrophes. The same script found no en or em dashes in the article.
- Quotes stop wherever BetaList's sentence continues after an em dash (for example "Recently launched", "Clear product information", "We're not expecting world-class design", the own-domain rule, the "Visit Site" do-follow sentence, "Introductory pricing", and the Boost page's "one-time event" sentence). The refund time is written in the source as 5 and 10 joined by an en dash, so the page paraphrases it as "5 to 10 business days" outside a quote.
- The submission form itself was not filled in and no account was created. Its fields and limits come from `/help/submitting` and `/agent`, and the post says so.

## Sources

Live pages, each with the Internet Archive capture made on 24 October 2026 that the script read:

- Help (`/support` and `/faq` redirect here): https://betalist.com/help (capture `https://web.archive.org/web/20261024070002/https://betalist.com/help`)
- Submission criteria: https://betalist.com/criteria (capture `https://web.archive.org/web/20261024065843/https://betalist.com/criteria`), also as Markdown at https://betalist.com/criteria.md (capture `https://web.archive.org/web/20261024070208/https://betalist.com/criteria.md`)
- How to write a great submission: https://betalist.com/help/submitting (capture `https://web.archive.org/web/20261024070127/https://betalist.com/help/submitting`), also as Markdown at https://betalist.com/help/submitting.md (capture `https://web.archive.org/web/20261024070153/https://betalist.com/help/submitting.md`)
- Agent API: https://betalist.com/agent (capture `https://web.archive.org/web/20261024071301/https://betalist.com/agent`)
- Submission page: https://betalist.com/submit, which redirects to `/submissions/new` (capture `https://web.archive.org/web/20261024071221/https://betalist.com/submissions/new`)
- Submission Terms (linked from the Terms of Service as "Submission Terms"): https://betalist.com/terms/submissions (capture `https://web.archive.org/web/20261024070313/https://betalist.com/terms/submissions`)
- Terms of Service (governing law Singapore; links the Submission Terms; no launch rules): https://betalist.com/terms (capture `https://web.archive.org/web/20261024070445/https://betalist.com/terms`)
- Boost your startup: https://betalist.com/boost (capture `https://web.archive.org/web/20261024070510/https://betalist.com/boost`)
- Advertise on BetaList: https://betalist.com/advertise (capture `https://web.archive.org/web/20261024070628/https://betalist.com/advertise`)
- Designing your landing page, BetaList guides: https://guides.betalist.com/designing-your-landing-page (the listed capture `https://web.archive.org/web/20261024070656/https://guides.betalist.com/designing-your-landing-page` resolves to the 12 July 2026 copy, see the correction above; the current wording was read live on 25 October 2026)
- Homepage: https://betalist.com/ (capture `https://web.archive.org/web/20261024065920/https://betalist.com/`)

All of the above were read live again on 25 October 2026 (07:50 to 07:51 UTC, HTTP 200). For the comparison table, read on 25 October 2026:

- Product Hunt Help Center, Can I submit an unreleased product? (February 10, 2025): https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product
- Product Hunt Help Center, Product Hunt Featuring Guidelines (March 10, 2026): https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines
- Product Hunt Help Center, How to schedule a post (February 2, 2026): https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post
- Product Hunt Help Center, How to share a scheduled launch (June 30, 2026): https://help.producthunt.com/en/articles/15706445-how-to-share-a-scheduled-launch
- Product Hunt, How Product Hunt works (undated): https://www.producthunt.com/launch/how-product-hunt-works
- Product Hunt, `https://www.producthunt.com/upcoming` (404) and `https://www.producthunt.com/coming-soon` (the homepage), not linked from the post
- Uneed, How it works: https://www.uneed.best/how-it-works
- Uneed Help Center, What we accept (and what we don't): https://help.uneed.best/common-questions-and-issues/what-we-accept
- Show HN guidelines, Hacker News: https://news.ycombinator.com/showhn.html

## Pricing, re-verified 24 October 2026

- **Submissions are paid.** The Help page says "All submissions are paid. There is no free submission option." and "BetaList used to offer free submissions, but all submissions now require payment." Unchanged since 21 October.
- **The submission price is not public.** The Help page says "Current plans and prices are shown at the end of the submission form." and the Agent API page says "prices are shown when the founder picks one". No submission was started. The page says so and gives no figure.
- **Plan names.** The Agent API page names Lite (about 14 days), Standard (about 3 days) and Premium (about 1 day). The Submission Terms mention "Priority listing" and "Premium submissions". The page quotes both and notes that Premium is also the fastest plan's name, without claiming more.
- **Boost:** $99/week ("Billed weekly, cancel anytime") and $199/month ("Billed monthly, cancel anytime"), marked "Introductory pricing", on the Boost page and the Advertise page.
- **Sponsorship:** $4,999/month, "One sponsor at a time", on the Advertise page.
- **Advertising Premium (new):** $9,999/month on the Advertise page, "Everything in Sponsorship, made impossible to miss.", with "Prominent homepage placement above the fold, with image" and "One dedicated email to all 70k+ subscribers per month". Its three-month price ($25,000) is left out; the pricing section's dollar figures are $99, $199, $4,999 and $9,999, and the e2e test checks exactly those.

## Comparison table and checklist, 25 October 2026

Approved follow-up to PR #62. The post gains two sections, both on the publish day: "Before you submit: a readiness checklist" (`#checklist`, after the form section) and "BetaList vs other pre-launch options" (`#compared`, before Next steps), which links `/blog/product-hunt-alternatives`. The old one-line "Comparing BetaList with other launch sites?" link in Next steps was removed, since the new section links the alternatives post in its first sentence. The intro links both new sections.

**Method.** On 25 October 2026 from 07:50 to 07:51 UTC, `curl` with a Chrome user agent got HTTP 200 from every BetaList page listed under Sources, from `www.uneed.best/how-it-works`, `www.uneed.best/pricing`, `help.uneed.best`'s What we accept and `news.ycombinator.com/showhn.html`, with no Cloudflare challenge. `betalist.com/agent` is now served as `text/markdown`, so its plan list reads "**Lite**: featured within about 14 days." and so on, one plan per list item; quote 79 joins the three items and each was found. Product Hunt's help center and producthunt.com returned HTTP 403 to `curl`, as on 20 October, so its pages were read with the remote fetcher (Cursor WebFetch) on 25 October 2026 between about 07:45 and 07:50 UTC. A script then took every `<q>` from the rendered article (124 quotes, 123 unique) and searched for each in plain-text copies of those reads (tags dropped, entities decoded, Markdown bold removed, whitespace normalised). All were found; the plan line as its three list items. All 115 earlier quotes still match BetaList's live pages, so nothing on BetaList changed between 24 and 25 October.

**The table, row by row.** Every cell comes from the site's own pages, read on 25 October 2026. The page says "Checked on 25 October 2026." under the table.

| Row | Takes a pre-launch page? | Price | Wait | Link to your site |
| --- | --- | --- | --- | --- |
| BetaList | "Yes, with a way to sign up": `/criteria` lists "Not yet available to anyone (pre-launch landing page)." under Aim for, and its last section asks for a signup path | "Paid only; prices shown at the end of the form; full refund if not selected": `/help` ("All submissions are paid. There is no free submission option.", "Current plans and prices are shown at the end of the submission form.", "If your startup isn't selected, you get a full refund automatically.") | "About 14, 3 or 1 days to be featured, by plan": `/agent` (Lite, Standard, Premium) | "Do-follow if featured, through a 301 redirect": `/help` ("All plans include a do-follow backlink if featured", "The "Visit Site" button on your featured listing is a do-follow link", "It routes through a 301 redirect to your website") |
| Product Hunt, scheduled launch | "Occasionally; an email sign-up alone isn't eligible for the homepage": Can I submit an unreleased product? ("we occasionally allow pre-launch or crowdfunded products if they provide clear, detailed information", "Products that only offer an email sign-up are not eligible for the homepage.") | "Free": How Product Hunt works ("Product Hunt is free for everyone to use.") | "You pick a day within 30 days": How to schedule a post ("pick the day within 30 days of your current day for the post to go live") | "Not stated in its help center": help center searches for "nofollow" and "upcoming" returned no articles, and none of the articles above mentions link attributes |
| Uneed | "No: not behind a waitlist or invite code, even on a paid launch": What we accept ("If it's behind a waitlist, an invite code, or a sales call, we can't review it"; "closed or invite-only products are refused whatever you paid, and we refund you.") | "Free line; Fast-track $14.99; Skip the waiting line $39.99": How it works ("Join the free waiting line (free)", "Fast-track ($14.99)", "Skip the waiting line ($39.99)"), unchanged since the alternatives post's 21 October re-check | "Free: at least 30 days; Fast-track: about 2 weeks; Skip: you pick the date": How it works ("at least 30 days out, at the back of the line.", "around 2 weeks out", "pick the exact date you want.") | "Free: do-follow from an upvote score of 20; Fast-track: from 10; Skip: always": How it works ("20 to keep a do-follow backlink", "its backlink is do-follow from an upvote score of 10", "Published with a do-follow backlink for life, no minimum upvote score.") |
| Show HN | "No: no landing pages or sign-up pages": Show HN guidelines ("Don't post landing pages or fundraisers.", "Off topic: blog posts, sign-up pages, newsletters, lists, and other reading material.") | "No fee listed": the guidelines list none | "No review step described": the guidelines describe none ("Every Show HN appears on shownew.") | "Not stated in its guidelines" |

**Product Hunt "upcoming" and "coming soon".** The brief suggested Product Hunt's upcoming or coming soon pages. Neither exists as a feature now: on 25 October 2026 `https://www.producthunt.com/upcoming` returned HTTP 404 to the remote fetcher (the Internet Archive's latest copy, 21 February 2026, is also a 404), `https://www.producthunt.com/coming-soon` returned the homepage ("Top Products Launching Today"), and the help center has no article for "upcoming". The row is Product Hunt's scheduled launch instead, which the help center says can be made public before launch day ("so that anyone with the link can view it", How to share a scheduled launch, June 30, 2026), and the notes under the table say so.

**Sites considered and left out.**

- **r/alphaandbetausers**, the other pre-launch site in the alternatives post's "If your product is pre-launch or in beta" group. Reddit returned "You've been blocked by network security" to `curl` (HTTP 403) and to the remote fetcher, old.reddit asked for a login, and the Internet Archive's Save Page Now failed twice ("Job failed", HTTP 520) on 25 October 2026. Its latest archive copy is from 24 August 2026, so it couldn't be checked now and isn't in the table. The post says Reddit blocked our requests.
- **DevHunt, Fazier, Tiny Startups, Microlaunch, Peerlist Launchpad, Indie Hackers, r/SideProject** (also in the alternatives post). Not pre-launch options in that post's grouping, and not re-read for this table, so the table makes no claim about them.
- **LaunchLoop.** Ours, and not a launch board, so not in the table. The post says "LaunchLoop, which publishes this post, isn't either: it isn't a launch board."

**Figures.** The table adds only prices and day counts from the sites' own pages: $14.99, $39.99, 14, 3 and 1 days, 30 days, 2 weeks, and the upvote scores 10 and 20. No percentages. The BetaList pricing section's dollar figures are unchanged ($99, $199, $4,999, $9,999), and the e2e test checks the comparison section's only dollar figures are $14.99 and $39.99.

**The checklist.** Eleven items, all paraphrasing BetaList pages already quoted in the post, so it adds no quotes: new and a technology startup (`/criteria`), featured at most once before and only pre-launch (`/criteria`, Help), own domain and no free subdomain or app store page (`/criteria`, Help, Submission Terms), a landing page that looks like yours and says what it is, who it's for and what it looks like (`/criteria`), an obvious way in with only an email asked for (`/criteria`, landing page guide), the form fields and their limits (`/agent`, `/help/submitting`), an icon (ideally 512 px or larger) and at least one screenshot at roughly 4:3, because "Paying requires an icon and a screenshot" (`/agent`, `/help/submitting`), the page's share card (a link to `/tools/og-preview`, with no claim about how BetaList or any site shows it), traffic on any day including weekends (Submission Terms), UTM and ref=betalist in analytics (Help), and that a plan buys faster review, not acceptance, with a refund if not selected and a prompt reply if BetaList writes (Submission Terms, Help). It is a `<ul>` of bold-led items under an `h2`, the way the Show HN and Product Hunt checklists render theirs.

## Every quote on the page

Numbered in order of first appearance. "Unchanged" means the same words were in the 21 October log; for Help quotes the source moved from `/support` to `/help`.

| # | Quote (verbatim) | Source (live, 24 October 2026) | Since 21 Oct |
| --- | --- | --- | --- |
| 1 | "BetaList is the place for early adopters to discover upcoming and recently launched internet startups, and for startup founders to share their startup with the world and get early user feedback." | https://betalist.com/help | unchanged |
| 2 | "BetaList helps you find early-stage startups before they make it big." | https://betalist.com/ | unchanged |
| 3 | "We feature pre-launch and recently launched startups with a clear value proposition, a good design, and an innovative idea." | https://betalist.com/help | unchanged |
| 4 | "Promote your product to startup founders and early adopters" | https://betalist.com/advertise | unchanged |
| 5 | "Aim for" | https://betalist.com/criteria, https://betalist.com/help/submitting | new on 24 Oct |
| 6 | "Common pitfalls" | https://betalist.com/criteria, https://betalist.com/help/submitting | new on 24 Oct |
| 7 | "BetaList readers come here to discover what's new. If your product has been live for a while or has already had significant press coverage, it's not really news to them anymore." | https://betalist.com/criteria | new on 24 Oct |
| 8 | "Not yet available to anyone (pre-launch landing page)" | https://betalist.com/criteria | new on 24 Oct |
| 9 | "Private beta accessible by invitation only" | https://betalist.com/criteria | unchanged |
| 10 | "Recently launched" | https://betalist.com/criteria | unchanged |
| 11 | "Launched months or years ago" | https://betalist.com/criteria | new on 24 Oct |
| 12 | "Already received significant press coverage" | https://betalist.com/criteria | unchanged |
| 13 | "A familiar product re-released for a different platform without meaningful changes" | https://betalist.com/criteria | new on 24 Oct |
| 14 | "Each startup gets up to two opportunities to be featured: once pre-launch and once at launch. There should be at least a few weeks between the two posts so they feel like distinct moments to our audience." | https://betalist.com/criteria | new on 24 Oct |
| 15 | "A pre-launch listing while you're still in private beta or building anticipation" | https://betalist.com/criteria | new on 24 Oct |
| 16 | "A launch listing once your product is publicly available" | https://betalist.com/criteria | new on 24 Oct |
| 17 | "Submitting again so soon after a previous feature that nothing has visibly changed" | https://betalist.com/criteria | new on 24 Oct |
| 18 | "Re-submitting the same launch hoping for a second post" | https://betalist.com/criteria | new on 24 Oct |
| 19 | "Our audience comes to BetaList specifically to discover new technology startups." | https://betalist.com/criteria | new on 24 Oct |
| 20 | "Software products (web apps, mobile apps, dev tools, AI tools, etc.)" | https://betalist.com/criteria | new on 24 Oct |
| 21 | "Hardware products and connected devices" | https://betalist.com/criteria | new on 24 Oct |
| 22 | "Familiar ideas with a genuinely new twist" | https://betalist.com/criteria | new on 24 Oct |
| 23 | "Blogs, online courses, books, or newsletters" | https://betalist.com/criteria | new on 24 Oct |
| 24 | "Subscription e-commerce or general online stores" | https://betalist.com/criteria | new on 24 Oct |
| 25 | "Familiar ideas without substantial improvements over what already exists" | https://betalist.com/criteria | new on 24 Oct |
| 26 | "Consultancies or agencies" | https://betalist.com/criteria | new on 24 Oct |
| 27 | "Generic templates don't inspire confidence and reliably convert worse than a custom page." | https://betalist.com/criteria | new on 24 Oct |
| 28 | "We're not expecting world-class design" | https://betalist.com/criteria | new on 24 Oct |
| 29 | "A distinct design that visibly belongs to your product" | https://betalist.com/criteria | new on 24 Oct |
| 30 | "A heavily customized template, if you started from one, so it no longer looks templated" | https://betalist.com/criteria | new on 24 Oct |
| 31 | "Clear product information" | https://betalist.com/criteria | new on 24 Oct |
| 32 | "what it is, who it's for, what it looks like" | https://betalist.com/criteria | new on 24 Oct |
| 33 | "An untouched free or paid template" | https://betalist.com/criteria | new on 24 Oct |
| 34 | "Default Bootstrap or other off-the-shelf framework styles" | https://betalist.com/criteria | new on 24 Oct |
| 35 | "A page whose only content is an explainer video" | https://betalist.com/criteria | new on 24 Oct |
| 36 | "Hosted landing-page builders (LaunchRock, Unbounce, KickoffLabs, Carrd, etc.)" | https://betalist.com/criteria | new on 24 Oct |
| 37 | "Free hosting subdomains like yourapp.vercel.app, yourapp.netlify.app, or yourapp.herokuapp.com" | https://betalist.com/criteria | new on 24 Oct |
| 38 | "A direct link to App Store, Google Play, Kickstarter, Indiegogo, or a Facebook page instead of a real landing page" | https://betalist.com/criteria | new on 24 Oct |
| 39 | "Your startup must have its own domain" | https://betalist.com/help | unchanged |
| 40 | "We do not accept app store links or pages hosted on free subdomains." | https://betalist.com/terms/submissions | unchanged |
| 41 | "The point of being featured is to get people into your product (or onto your waitlist). Make sure that path exists and is easy to find on your landing page." | https://betalist.com/criteria | new on 24 Oct |
| 42 | "A custom email signup form" | https://betalist.com/criteria | new on 24 Oct |
| 43 | "An embedded form from Mailchimp, ConvertKit, or similar" | https://betalist.com/criteria | new on 24 Oct |
| 44 | "A download button or app store link" | https://betalist.com/criteria | new on 24 Oct |
| 45 | "Sign in with Google, Apple, GitHub, etc." | https://betalist.com/criteria | new on 24 Oct |
| 46 | "Follow us on X to get notified" | https://betalist.com/criteria | new on 24 Oct |
| 47 | "A landing page with no clear next step at all" | https://betalist.com/criteria | new on 24 Oct |
| 48 | "We receive thousands of submissions every month. We prioritize startup submissions that have a clear value proposition, have an idea we haven't seen before, and have a well-designed landing page, because these are the things that our audience is looking for." | https://betalist.com/help | unchanged |
| 49 | "Unfortunately we're not able to provide specific feedback on individual submissions." | https://betalist.com/help | unchanged |
| 50 | "Submitting your startup does not guarantee it will be featured. BetaList maintains full editorial and curatorial discretion over which startups are featured, and this decision is final." | https://betalist.com/terms/submissions | unchanged |
| 51 | "Submitting a startup you do not represent, including through affiliate or referral links, is not permitted." | https://betalist.com/terms/submissions | unchanged |
| 52 | "Work in progress." | https://guides.betalist.com/designing-your-landing-page | unchanged |
| 53 | "If your product isn't ready yet, you should still be able to create a mockup of at least one screen." | https://guides.betalist.com/designing-your-landing-page | unchanged |
| 54 | "Don't use a generic template page." | https://guides.betalist.com/designing-your-landing-page | unchanged |
| 55 | "The signup form should be front and center. Don't hide it on another page. Don't ask for information you don't need. The email address should be enough." | https://guides.betalist.com/designing-your-landing-page | new on 24 Oct |
| 56 | "Since your product isn't ready yet, "Get early access" will probably do fine." | https://guides.betalist.com/designing-your-landing-page | unchanged |
| 57 | "What are you? Why should I care?" | https://guides.betalist.com/designing-your-landing-page | unchanged |
| 58 | "You are responsible for ensuring your website is live, functioning correctly, and able to handle traffic at the time of featuring." | https://betalist.com/terms/submissions | unchanged |
| 59 | "New here? We create your account on the spot." | https://betalist.com/submit | new on 24 Oct |
| 60 | "Current plans and prices are shown at the end of the submission form." | https://betalist.com/help | unchanged |
| 61 | "Payment is charged when you choose a plan and complete checkout. Our editorial team then reviews your startup. You'll get an email with the decision. If accepted, we feature it on the timeline for your plan." | https://betalist.com/help | unchanged |
| 62 | "Paste this into your coding agent. It reads our instructions, drafts your submission and sends you a link to review and pay." | https://betalist.com/submit | new on 24 Oct |
| 63 | "The agent never pays and cannot publish." | https://betalist.com/agent | new on 24 Oct |
| 64 | "Text is validated with the web form's rules and messages" | https://betalist.com/agent | new on 24 Oct |
| 65 | "Your home page on your own domain." | https://betalist.com/help/submitting | new on 24 Oct |
| 66 | "Just the product name as it appears on your homepage" | https://betalist.com/help/submitting | new on 24 Oct |
| 67 | "A single, plain sentence that makes it immediately obvious what your product does." | https://betalist.com/help/submitting | new on 24 Oct |
| 68 | "the single most common edit we make" | https://betalist.com/help/submitting | new on 24 Oct |
| 69 | "One or two short paragraphs of plain prose describing your product, who it's for, and why it's worth their time." | https://betalist.com/help/submitting | new on 24 Oct |
| 70 | "Specific almost always beats generic." | https://betalist.com/help/submitting | new on 24 Oct |
| 71 | "Square app icon, ideally 512 px or larger." | https://betalist.com/agent | new on 24 Oct |
| 72 | "Roughly 4:3 aspect ratio" | https://betalist.com/help/submitting | new on 24 Oct |
| 73 | "Paying requires an icon and a screenshot" | https://betalist.com/agent | new on 24 Oct |
| 74 | "By submitting, you grant us the right to edit your submission for grammar, clarity, and length; to select, crop, or create images; and to categorize your startup as we see fit." | https://betalist.com/terms/submissions | unchanged |
| 75 | "You retain ownership of your content." | https://betalist.com/terms/submissions | unchanged |
| 76 | "All submissions are paid. There is no free submission option." | https://betalist.com/help | unchanged |
| 77 | "BetaList used to offer free submissions, but all submissions now require payment." | https://betalist.com/help | unchanged |
| 78 | "prices are shown when the founder picks one" | https://betalist.com/agent | new on 24 Oct |
| 79 | "Lite: featured within about 14 days. Standard: featured within about 3 days. Premium: featured within about 1 day." | https://betalist.com/agent | new on 24 Oct |
| 80 | "Plans differ mainly by how quickly your startup is featured and whether newsletter inclusion is guaranteed." | https://betalist.com/help | unchanged |
| 81 | "All plans include a do-follow backlink if featured, and a full refund if not selected. All submissions must still meet our submission guidelines." | https://betalist.com/help | unchanged |
| 82 | "If you've already submitted on a lower plan and want faster featuring or newsletter inclusion, you can upgrade from your dashboard." | https://betalist.com/help | unchanged |
| 83 | "Priority listing is a paid service that moves your submission to the front of the review queue." | https://betalist.com/terms/submissions | unchanged |
| 84 | "Priority listing guarantees faster review, not acceptance or any specific results." | https://betalist.com/terms/submissions | unchanged |
| 85 | "Premium submissions can pick a preferred date of featuring, subject to availability." | https://betalist.com/terms/submissions | unchanged |
| 86 | "If your startup is not selected, you will receive a full refund automatically. Once your startup has been featured, refunds are not available." | https://betalist.com/help | unchanged |
| 87 | "If your priority listing submission is not accepted for featuring, you are generally eligible for a refund." | https://betalist.com/terms/submissions | unchanged |
| 88 | "Refunds are provided at BetaList's discretion." | https://betalist.com/terms/submissions | unchanged |
| 89 | "Refunds may be issued minus payment processing fees at our discretion." | https://betalist.com/terms/submissions | unchanged |
| 90 | "Introductory pricing" | https://betalist.com/boost | unchanged |
| 91 | "Your startup appears in the "Boosted" section on the BetaList homepage, rotated among active boosts." | https://betalist.com/boost | unchanged |
| 92 | "Yes, boosts are available for startups that have been featured on BetaList." | https://betalist.com/boost | unchanged |
| 93 | "If you don't match the guidelines or want additional exposure you can have a look at our advertising packages." | https://betalist.com/help | unchanged |
| 94 | "It depends on the plan you paid for. The expected timeline is shown when you choose a plan and in your confirmation email." | https://betalist.com/help | unchanged |
| 95 | "A human reviews within the plan's time frame." | https://betalist.com/agent | new on 24 Oct |
| 96 | "Most submissions wait days or weeks before publishing, so dated offers often expire before they go live." | https://betalist.com/help/submitting | new on 24 Oct |
| 97 | "Advertised timeframes for featuring represent our best effort and may vary based on volume and other factors." | https://betalist.com/terms/submissions | unchanged |
| 98 | "Do not promise a date: every paid submission is reviewed and declined ones are refunded." | https://betalist.com/agent | new on 24 Oct |
| 99 | "If we contact you regarding your submission, you are responsible for responding promptly." | https://betalist.com/terms/submissions | unchanged |
| 100 | "Focus on improving your value proposition, design, and uniqueness before resubmitting." | https://betalist.com/help | unchanged |
| 101 | "Otherwise, you cannot choose the exact date of featuring, and your startup may be featured on any day including weekends and holidays." | https://betalist.com/terms/submissions | unchanged |
| 102 | "We feature around 20 new startups every day." | https://betalist.com/criteria | new on 24 Oct |
| 103 | "your startup appears on BetaList for a day and then moves down the list." | https://betalist.com/boost | unchanged |
| 104 | "The Trending Startups section on the homepage showcases the most popular, recently featured startups." | https://betalist.com/help | unchanged |
| 105 | "We take a few metrics in mind, including how many tweets a startup post has received. We're not disclosing the exact algorithm, but the more engagement your startup post receives, the higher its chances of getting trending." | https://betalist.com/help | unchanged |
| 106 | "When it isn't guaranteed, the newsletter only includes the most popular featured startups. It takes at least 24 hours between a startup getting featured and being included in the newsletter so we can fairly determine popularity." | https://betalist.com/help | unchanged |
| 107 | "The "Visit Site" button on your featured listing is a do-follow link" | https://betalist.com/help | unchanged |
| 108 | "It routes through a 301 redirect to your website so we can track clicks and add ref=betalist attribution." | https://betalist.com/help | unchanged |
| 109 | "We automatically add UTM tracking parameters to links to your website, so you can track traffic from BetaList using Google Analytics or similar tools." | https://betalist.com/help | unchanged |
| 110 | "We may also change how your startup is presented on our platform, including design, layout, and link attributes, without notice." | https://betalist.com/terms/submissions | unchanged |
| 111 | "Submissions that are misleading, fraudulent, or otherwise violate these terms may be rejected or removed at any time." | https://betalist.com/terms/submissions | unchanged |
| 112 | "If you receive sales or promotional emails after being featured, it's likely because service providers scrape startup directories (including BetaList) for leads and find publicly available contact information on your own website or social media profiles." | https://betalist.com/help | unchanged |
| 113 | "Most edits are approved automatically within minutes; the rest are reviewed by our team." | https://betalist.com/help | unchanged |
| 114 | "The one rule for moving to a new domain is that your old URL must redirect to your new one" | https://betalist.com/help | unchanged |
| 115 | "We generally only feature each startup once, with one exception" | https://betalist.com/help | unchanged |
| 116 | "All plans include a do-follow backlink if featured, and a full refund if not selected." | https://betalist.com/help (live, 25 October 2026) | new on 25 Oct, the first sentence of quote 81 |
| 117 | "will not be indexed on the site, and no users will be able to upvote it until the scheduled time." | https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post (live, 25 October 2026) | new on 25 Oct |
| 118 | "We prioritize fully launched products that users can explore and engage with immediately." | https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product (live, 25 October 2026) | new on 25 Oct |
| 119 | "Products that only offer an email sign-up are not eligible for the homepage." | https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product (live, 25 October 2026; the source starts the line with a 🚫 emoji) | new on 25 Oct |
| 120 | "Waitlisted products (unless immediate access is provided)" | https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines (live, 25 October 2026) | new on 25 Oct |
| 121 | "Product Hunt is free for everyone to use." | https://www.producthunt.com/launch/how-product-hunt-works (live, 25 October 2026) | new on 25 Oct |
| 122 | "If it's behind a waitlist, an invite code, or a sales call, we can't review it" | https://help.uneed.best/common-questions-and-issues/what-we-accept (live, 25 October 2026; stops where the list item ends) | new on 25 Oct |
| 123 | "Don't post landing pages or fundraisers." | https://news.ycombinator.com/showhn.html (live, 25 October 2026) | new on 25 Oct |

## Paraphrased claims and their sources

- Each criteria section has an "Aim for" and a "Common pitfalls" list: `/criteria`, all five sections.
- "Recently launched", ideally in the last few weeks: `/criteria`, the rest of the "Recently launched" item after its em dash ("ideally within the last few weeks").
- Other kinds of products tend to do worse there, even good ones: `/criteria`, the sentence after "discover new technology startups." (it says such products "tend to under-perform here", with "even great ones" set off by em dashes).
- Only a page that is clearly yours and tells visitors enough to decide: `/criteria` (the rest of the "world-class design" sentence after its em dash).
- Audience figures (70,000+ newsletter subscribers, 500,000+ pageviews per month, 24,000+ startups featured) and the plan cards' "70k+ subscribers": Advertise page. Given as BetaList's own figures.
- Product Hunt is a poor fit for a bare waitlist: our own Product Hunt post, which quotes Product Hunt's featuring guidelines.
- The first step of the submission form asks for your website URL and email: `/submissions/new` ("Website URL", "Your email").
- You still open the agent's link, review the draft, choose a plan and pay yourself: Agent API page ("It brings back a claim link: open it to review the draft, pick a plan and pay.").
- Field limits (website URL and name 255 characters, pitch 75 characters and one sentence, description 700 characters and plain text, up to 5 topics, one icon, up to 5 screenshots, promotion details about 500 characters) and the optional YouTube video, TestFlight link and signup URL: Agent API page, Fields table.
- No tagline or extra keywords in the name: `/help/submitting` ("Tacking on a tagline or extra keywords after the name.").
- A pitch packed with several clauses: `/help/submitting` ("Cramming multiple sentences into one with an em dash, semicolon, or ...").
- The FAQ sends you to your dashboard to check a submission's status: Help, "How can I see the status of my startup submission? Visit your dashboard."
- No public page says which plans guarantee newsletter inclusion: Help says it "depends on the plan you chose"; the Agent API page's plan list gives only featuring times.
- Refunds can take 5 to 10 business days to reach your statement: Help, "How long does a refund take?" (source uses an en dash).
- They reserve the right to limit or deny refunds in some cases, including repeated rejected submissions: Submission Terms, section 4 ("We reserve the right to limit or deny refunds in cases of abuse, repeated rejected submissions, violations of these terms, or if your startup is ultimately featured.").
- Boost is cancel anytime: Boost page plan cards.
- Advertising Premium adds homepage placement above the fold and one dedicated email a month to all 70k+ subscribers: Advertise page Premium card.
- You can resubmit after a rejection: Help, "Can I resubmit my startup after it was rejected?" ("Yes, you are welcome to resubmit your startup in the future if you've made improvements based on our submission guidelines.").
- A startup featured before launch can be featured again at launch: Help, "How do I get featured again?" (the rest of the sentence after "with one exception" contains the typo "eligble", so it is paraphrased).
- Look for the source "betalist" in your analytics: Help ("Check your analytics dashboard for traffic from source "betalist".").
- Share your BetaList post on the day: our reading of the Trending answer ("the more engagement your startup post receives, the higher its chances of getting trending").
- None of BetaList's pages above sets upvote or launch-day conduct rules: checked on Help, the criteria, the submission guide, the Agent API page, the Submission Terms, the Terms of Service, Boost and Advertise.
- Comparison notes, 25 October 2026. A scheduled Product Hunt launch is private until you make it public: How to share a scheduled launch ("By default, all scheduled launches are only visible by the Makers and product team members associated with the launch."). We found no help center article on review times or link attributes: help center searches on 25 October. On Uneed's free line a score of 10 to 19 keeps the product published with a nofollow link: How it works ("From 10 to 19, it stays published with a nofollow link."). Closed or invite-only products are refused even on a paid launch, with a refund: What we accept ("closed or invite-only products are refused whatever you paid, and we refund you"). Show HN lists no fee, describes no review step and says nothing about links: the whole guidelines page, read on 25 October.
- Site QA nit (21 October 2026): the refund paragraph quotes the Submission Terms' "If your priority listing submission is not accepted for featuring, you are generally eligible for a refund." before the two discretion clauses, each in its own sentence. All three refund quotes still match on 24 October.

## LaunchLoop mention

"A LaunchLoop kit drafts a tagline, a description and launch images from your repo and live page, which you can adapt for your BetaList listing. It doesn't submit anything for you: you still create your BetaList account, fill in the form and choose a plan yourself." The shared preview CTA is rendered by `BlogPostLayout`.

Under the comparison table (25 October 2026): "LaunchLoop, which publishes this post, isn't either: it isn't a launch board." LaunchLoop has no row, and the e2e test fails if the table mentions it. The checklist links LaunchLoop's free `/tools/og-preview` and no other `/tools` page.

## Left out, and why

- **The submission prices.** Only shown inside the submission flow; no public page or archive copy has them.
- **Which plans guarantee newsletter inclusion.** Not stated publicly.
- **The Trending algorithm.** Help says "We're not disclosing the exact algorithm".
- **The advertising Premium tier's three-month price** ($25,000). Not relevant to submitting.
- **The Agent API's technical details** (endpoints, tokens, rate limits, image fetch rules) and its rule that a website featured in the last 12 months is refused through the API. API behaviour, not a published rule for the web form.
- **Old quotes no longer used:** 29 old `/criteria` quotes (old numbers 5 to 30 and 33 to 38, apart from 8, 9 and 11, which still match and are kept). 27 of them no longer matched (28 old quotes in all with the landing guide's old 46, below); old 19 ("Subscription e-commerce") and old 38 (the X line with its own quote marks) still matched but now use the fuller wording. Also dropped: the old landing guide wording "The sign up form" (old 46), and two Help quotes that still match but no longer fit the rewritten steps: "Visit the homepage and click the sign up button at the top right." (old 50) and "You can update the icon, name, pitch, description, website URL, and images." (old 53).
- **The landing page guide's MailChimp credit offer** ("Use this link for a free $30 credit."). An affiliate offer, not a submission rule.
- **The API access answer** in Help. Not relevant to launching.
- **Third-party BetaList guides.** Not primary, not used.
- **Any LaunchLoop metric or testimonial.** None used.
