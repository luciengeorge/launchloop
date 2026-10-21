# Source check: Product Hunt alternatives, 22 October 2026

Blog post for `/blog`, requested on Tuesday 20 October 2026. Every source was read on 20 October 2026 between about 18:40 and 19:15 UTC. Every quote on the page was copied from the fetched page, not from memory or a search snippet, and then checked again by script against saved copies of those pages (see Method). After QA found that Uneed's pages had changed, every price on the page and every Uneed quote were checked again on the live pages on Wednesday 21 October 2026, between about 13:07 and 13:12 UTC (see "Re-check, 21 October 2026").

## Page

**URL:** `/blog/product-hunt-alternatives`
**Title:** `Product Hunt alternatives: where to launch · LaunchLoop` (55 characters)
**Description:** `Sites like Product Hunt, from their own pages: who BetaList, Uneed, Peerlist, DevHunt, Show HN and others are for, what a launch costs and the rules.` (149 characters)
**H1:** Product Hunt alternatives for indie makers. **Published and updated:** 2026-10-22, as the brief asked (bump both in `src/lib/blog.ts` if it merges on another day). **Byline:** Lucien George. **Reading time:** 19 minutes (3,745 words in the rendered body at 200 words a minute; the e2e suite recounts it).

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

Its page also leads with its own waitlist product. Ours differs by quoting each site, giving the date every price was read, flagging where a site's own pages contradict each other (Tiny Startups, BetaList's newsletter figures, Microlaunch's Pro price), and not scoring or ranking the sites. The post doesn't name LaunchList; it says "some lists of Product Hunt alternatives still call BetaList free", which the table above supports (the Nick Launches comparison, `nicklaunches.com/blog/product-hunt-alternative/`, also lists BetaList's free tier as "Free").

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
- **BetaList** (pre-launch and beta): FAQ, Submission Guidelines, Boost and Advertise. Submission prices are only inside the signed-in submission form, so the post doesn't state them.
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

- **BetaList submission prices.** Shown only at the end of the signed-in submission form.
- **Microlaunch's free route.** Its launch window, signed out, shows only Pro Launch, which "Skip the queue". Third-party directories (saascity.io, launchdirectories.com, launchto.win) say a free queue exists, but no Microlaunch page we could read says so, so the post doesn't claim it.
- **Peerlist's identity verification fee.** The page says "a minimal fee" (and the identity page "a nominal one-time fee") without an amount.
- **Tiny Startups' Skip the queue price.** £29 on the About page; "Skip the queue £99" in the Terms of Service (effective May 2, 2026); and £69 in the submit form, whose upgrades step offers "Instant listing + DR 71+ do-follow backlink" (`amountCents: 6900`), described as "Your free listing skips the queue, launches this week, and its backlink switches to do-follow." The table says "£29 on its About page; higher in its terms and submit form". The body quotes the £29 and the £69 item, and says the terms list "a higher price" without the figure: `tests/e2e/pricing-consistency.spec.ts` fails any rendered page containing "£99", to keep LaunchLoop's retired £99 Ship Loop pre-order off the site, and that test was left as it is. The terms are linked, so readers can see the figure.
- **BetaList's newsletter size.** "60k+ subscribers" on the plan cards and "70,000+" elsewhere on the Boost and Advertise pages. The post gives both.
- **Microlaunch's Pro price.** $39 (crossed out at $49, code LAUNCH20, "This Week") on the cards; the FAQ on the same page says "Pro Launch ($49)". The post gives both.
- **The r/SideProject rules list.** The archived rules page shows the sidebar but no numbered rules. The post says so and tells readers to check the live page.

## Paraphrased claims and their sources

- DevHunt launches run for a week, voters are developers, and the platform is open source on GitHub: DevHunt FAQ, "How is DevHunt different from Product Hunt?".
- DevHunt audience, 150K page views a month and 40,000 newsletter subscribers: Advertise on DevHunt.
- Show HN appears on the Show HN new page first and on the show page after a small points threshold; the project must be your own and non-trivial: Show HN guidelines.
- BetaList accepts products "Not available to anyone yet", "Private beta accessible by invitation only" and "Recently launched", and rejects "Launched weeks ago or longer": Submission Guidelines (the rejected items are the list styled `text-red-500`). The same applies to the landing page items (templates, Bootstrap, LaunchRock, Unbounce, free hosting subdomains, direct app store links) and the signup items ("Follow us on X to get notified").
- BetaList: payment at checkout, editorial review, decision by email: FAQ, "What happens after I submit my startup?". Boost, $99/week or $199/month, only for featured startups, keeps you on the homepage and in the newsletter: Boost page.
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
- **Dates:** published and updated stay 2026-10-22 in `src/lib/blog.ts`, which feeds the byline, the BlogPosting JSON-LD, the sitemap and the RSS feed.

## Sources

- DevHunt FAQ: https://devhunt.org/faq
- Advertise on DevHunt: https://devhunt.org/advertise
- Show HN guidelines: https://news.ycombinator.com/showhn.html
- BetaList Support & FAQ: https://betalist.com/faq
- BetaList Submission Guidelines: https://betalist.com/criteria
- BetaList Boost: https://betalist.com/boost
- Advertise on BetaList: https://betalist.com/advertise
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
| 13 | "BetaList is the place for early adopters to discover upcoming and recently launched internet startups, and for startup founders to share their startup with the world and get early user feedback." | https://betalist.com/faq |
| 14 | "Your product should be recently launched or still be unreleased." | https://betalist.com/criteria |
| 15 | "All submissions are paid. There is no free submission option." | https://betalist.com/faq |
| 16 | "Current plans and prices are shown at the end of the submission form." | https://betalist.com/faq |
| 17 | "If your startup isn't selected, you get a full refund automatically." | https://betalist.com/faq |
| 18 | "differ mainly by how quickly your startup is featured and whether newsletter inclusion is guaranteed." | https://betalist.com/faq |
| 19 | "Promote your product to startup founders and early adopters" | https://betalist.com/advertise (re-read live on 21 October 2026: `curl`, HTTP 200, no Cloudflare challenge) |
| 20 | "Your startup must have its own domain" | https://betalist.com/faq |
| 21 | "It's not the right place to promote your blog, newsletter, online store, etc." | https://betalist.com/criteria |
| 22 | "Each startup gets two opportunities to be featured. Once pre-launch, and once during launch." | https://betalist.com/criteria |
| 23 | "Our innovators need people to use their products and give them feedback!" | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 24 | "Please tag title with stage and system, i.e., [Android, Alpha] or [IOS, Beta]" | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 25 | "Please add a description of your product" | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 26 | "Posts must include links to products that are ready to be tested" | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 27 | "DO NOT post links to pages that only request email addresses or "registration for launch" or "apply here" for future testing. These will be removed." | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 28 | "If you are posting, please take the time to test someone else's product as well." | https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/ |
| 29 | "Uneed is a social launchpad for tech products." | https://www.uneed.best/how-it-works; https://www.uneed.best/pricing |
| 30 | "Every day at 12:00 AM PST, a new batch of products goes live on the homepage" | https://www.uneed.best/how-it-works |
| 31 | "Submitting is not scheduling." | https://www.uneed.best/how-it-works |
| 32 | "at least 30 days out, at the back of the line." | https://www.uneed.best/how-it-works (read live on 21 October 2026; replaces the earlier quote, which is no longer on the page) |
| 33 | "Your launch needs an upvote score of 10 on launch day to stay published, and 20 to keep a do-follow backlink." | https://www.uneed.best/how-it-works |
| 34 | "pick the exact date you want. Published with a do-follow backlink for life, no minimum upvote score." | https://www.uneed.best/how-it-works (re-read live on 21 October 2026, after "Skip the waiting line ($39.99):") |
| 35 | "mostly made of founders, indie hackers, tech enthusiasts" | https://www.uneed.best/pricing (re-read live on 21 October 2026: `curl`, HTTP 200, no Cloudflare challenge) |
| 36 | "Free submissions go through moderation and can be declined, most often because they fall into a category we already receive dozens of every week. Paid launches are never declined." | https://www.uneed.best/how-it-works |
| 37 | "Our reviewers need to be able to actually try your product." | https://help.uneed.best/common-questions-and-issues/what-we-accept |
| 38 | "Don't buy votes: we detect it, the votes get removed, and repeat offenders get banned." | https://www.uneed.best/how-it-works |
| 39 | "Find your next favorite product or submit your own." | https://fazier.com/submit |
| 40 | "Give your product the spotlight it deserves. Start free or go premium for maximum visibility." | https://fazier.com/submit |
| 41 | "Reviewed & listed within 30 days" | https://fazier.com/submit |
| 42 | "A backlink to our site is required (on your homepage or footer)" | https://fazier.com/submit |
| 43 | "there must be 6 months gap between launches and your product is improved considerably." | https://falakdigital.notion.site/FAQs-8e4b805abeef4343ba0ae528d32ab292 |
| 44 | "Content must be accurate, not misleading, not obscene, libelous, hateful, or infringing on any rights." | https://fazier.com/terms-of-service |
| 45 | "Tiny Startups is a startup launch platform, startup directory, and Product Hunt alternative built for indie makers." | https://www.tinystartups.com/about |
| 46 | "Launches compete on a weekly leaderboard" | https://www.tinystartups.com/about |
| 47 | "Every listing is hand-approved." | https://www.tinystartups.com/about |
| 48 | "Launching is free; Skip the queue (£29) puts you in the next Monday batch" | https://www.tinystartups.com/about |
| 49 | "Instant listing + DR 71+ do-follow backlink" | https://www.tinystartups.com/submit (upgrades step, from the form's JavaScript bundle) |
| 50 | "Your free listing skips the queue, launches this week, and its backlink switches to do-follow." | https://www.tinystartups.com/submit (upgrades step, from the form's JavaScript bundle) |
| 51 | "All sales are final. We do not offer refunds." | https://www.tinystartups.com/terms |
| 52 | "Free submissions enter a review queue and are not guaranteed to be approved or given a specific launch date." | https://www.tinystartups.com/terms |
| 53 | "Rank is upvotes, nothing else: clicks and reviews never move a listing." | https://www.tinystartups.com/about |
| 54 | "Artificial inflation of votes (bots, purchased votes, coordinated campaigns) is prohibited and will result in removal and account suspension." | https://www.tinystartups.com/terms |
| 55 | "Microlaunch is where makers launch and grow their products." | https://microlaunch.net/premium (FAQ) |
| 56 | "Your launch campaign runs for 30 days, during which your product is showcased to our community of Tech Makers from around the world." | https://microlaunch.net/premium (FAQ) |
| 57 | "Skip the queue, go Live Now or Schedule" | https://microlaunch.net/ ("Pick your Launch" window) |
| 58 | "OSS Projects & Students, get 50% OFF Now." | https://microlaunch.net/ ("Pick your Launch" window) |
| 59 | "Products rank over 1 month" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 60 | "Products are onboarded between the 1st-15th" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 61 | "Only signed users can vote" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 62 | "Makers can submit multiple products, with a maximum of two ranking per month." | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 63 | "No bots allowed on the platform" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 64 | "Roasts tend to lower your product score while increasing your final rank" | https://microlaunch.net/ ("Microlaunch Rules" window) |
| 65 | "Launch window opens on Monday every week!" | https://help.peerlist.io/individual/launchpad/introduction |
| 66 | "Anyone with a Verified Peerlist profile can launch their products on Peerlist Launchpad." | https://help.peerlist.io/individual/launchpad/frequently-asked-questions-about-spotlight-by-peerlist |
| 67 | "Only projects that are 100% complete are eligible for launching on Launchpad." | https://help.peerlist.io/individual/launchpad/how-to-launch-a-project-on-peerlist-launchpad |
| 68 | "Workplace verification is free. Identity verification has a minimal fee associate with it." | https://help.peerlist.io/individual/peerlist-profile/verification |
| 69 | "We have zero tolerance for spamming." | https://help.peerlist.io/individual/launchpad/guidelines-faqs |
| 70 | "Only individual profiles are allowed to launch projects." | https://help.peerlist.io/individual/launchpad/guidelines-faqs |
| 71 | "SEO marketing agencies are strictly prohibited from launching projects on behalf of their clients or customers." | https://help.peerlist.io/individual/launchpad/guidelines-faqs |
| 72 | "For first 2 days (Monday and Tuesday), the projects are in random order to give equal exposure to all the projects launched." | https://help.peerlist.io/individual/launchpad/frequently-asked-questions-about-spotlight-by-peerlist |
| 73 | "No, only the top 5 projects of the week are awarded a backlink." | https://help.peerlist.io/individual/launchpad/frequently-asked-questions-about-spotlight-by-peerlist |
| 74 | "Indie Hackers is a place where the founders of profitable businesses and side projects can share their stories transparently, and where entrepreneurs can come to read and learn from those examples." | https://www.indiehackers.com/about |
| 75 | "You're an indie hacker if you've set out to make money independently." | https://www.indiehackers.com/about |
| 76 | "Welcome to r/SideProject, a subreddit for sharing and receiving constructive feedback on side projects." | https://web.archive.org/web/20260828184531/https://old.reddit.com/r/SideProject/about/rules |
| 77 | "When submitting a link to a project or startup, please use this format: [Project name] - [Short description]." | https://web.archive.org/web/20260828184531/https://old.reddit.com/r/SideProject/about/rules |
