# Source check: how to launch on Product Hunt, 21 October 2026

Blog post for the new `/blog`, requested on Tuesday 20 October 2026. Sources were read the same day between about 17:35 and 18:00 UTC. Every quote on the page was copied from the fetched page, not from memory or a search snippet, and then checked again by script (see Method).

## Page

**URL:** `/blog/how-to-launch-on-product-hunt`
**Title:** `How to launch on Product Hunt: how it works · LaunchLoop` (56 characters)
**Description:** `Launching on Product Hunt, from its own help center: how it works, whether to launch there, who can post, the rules on upvotes, and what follows launch day.` (156 characters)
**H1:** How to launch on Product Hunt. **Published and updated:** 2026-10-21 (the planned publish date in the brief; bump `published` and `updated` in `src/lib/blog.ts` if it merges on another day). **Byline:** Lucien George.

Targets "how to launch on product hunt" and "launching on product hunt". No keyword volumes were looked up for this post, so none are quoted.

### Scope, and the split with the checklist

`/product-hunt-launch-checklist` keeps "product hunt launch checklist": the timed, step-by-step list (a week out, the listing, images, rules, launch day, the week after). The post does not repeat those steps. It covers how Product Hunt works, whether to launch there at all, PH's own rules on who can post, scheduling and upvotes, what the listing needs, and what launch day and the weeks after look like. It links to the checklist for the step-by-step (intro, scheduling section with `#one-week-out`, next steps), to `/how-to-write-a-product-hunt-tagline` and to `/tools/product-hunt-tagline-checker` instead of covering the tagline, and to `/how-to-launch-a-vibe-coded-app`.

An earlier draft had a pre-submit list and a first-comment outline. Both were removed after review because the checklist already has a listing section, a maker comment item and launch-day steps.

Site QA review (GO with nits, 20 October 2026): "What the listing needs" still repeated the checklist's "Write the listing" and "Prepare the images" (name, tagline 60, description 260, topics, thumbnail 240x240, video, maker comment). Those items, and their quotes, were cut. The section now keeps only what the checklist lacks: 2+ gallery images, YouTube links only, no shortened or UTM links, the direct-link myth, the pricing options and shoutouts. For everything else it links `/product-hunt-launch-checklist#the-listing` and `/product-hunt-launch-checklist#images`; both anchors exist on the checklist (`<h2 id="the-listing">Write the listing</h2>`, `<h2 id="images">Prepare the images</h2>`). The e2e test checks that the section links both anchors, that the anchors exist, and that none of the cut items appear in it.

The post's title and description share no wording with the checklist's (`Product Hunt launch checklist (2026 guide)`, `A step-by-step Product Hunt launch checklist: ...`). `tests/unit/blog.test.ts` checks that neither contains "checklist" or "step-by-step", and that every indexable page has a unique title and description.

## Update, 26 October 2026

The weekly fact check found that Product Hunt's relaunch article (https://help.producthunt.com/en/articles/484934-can-i-relaunch-my-product, shown as "Updated this week") now says two months, not six: "we ask Makers to wait at least two months between posts for the same product or from the same company." It also has a new "Domain-Based Restrictions" section: "Products that share the same root domain must adhere to a two-month submission gap." Preparing for launch (https://www.producthunt.com/launch/preparing-for-launch) agrees: "If this is your second time submitting the same product in less than two months, see here."

Read with Cursor's WebFetch on 26 October 2026 (`curl` still gets the Cloudflare challenge). The only Internet Archive copy (12 October 2026) has the old six-month wording, so quotes 21 and 84 are live page only. The page now has 84 quotes, of which 61 match an archive copy word for word.

Changed on the page: the "Is now the right time?" bullet (quote 21 updated, quote 84 added), "The next launch is for the next big change" bullet (two months), the FAQ "Can I launch the same product on Product Hunt again?" (visible and FAQPage JSON-LD, which render from the same array), the Sources note and the relaunch article's date. `updated` in `src/lib/blog.ts` is now 2026-10-26. No other page on the site stated the six-month Product Hunt rule; Fazier's "6 months gap" in the Product Hunt alternatives post is Fazier's own rule and is unchanged.

## Method

- `curl` with a browser user agent: HTTP 403 with a Cloudflare challenge ("Just a moment...", `cf-mitigated: challenge`) on every help.producthunt.com and producthunt.com URL.
- Playwright: Chromium headless, and the installed Google Chrome headed on the VM display, both got the same challenge (HTTP 403, title "Just a moment...") on the Launch Guide and `/launch/before-launch`.
- A server-side fetch service (Cursor's WebFetch) returned the full text of every page cited below on 20 October 2026. It keeps the pages' own characters: straight and curly apostrophes appear as each page has them (the `/launch` pages mostly use curly ones, the help center mostly straight), and the quotes on the page keep them.
- Help center article URLs came from the Posting, Product Hunt and Support collections in the Internet Archive's copy of `https://help.producthunt.com/en/` (16 October 2026), because the fetch service drops links.
- Cross-check: the Internet Archive's latest copy of each cited page was downloaded and every `<q>` on the page was searched for in it. (Counts below are from 20 October; see "Update, 26 October 2026" for the relaunch quotes.) After the QA cuts, 62 of the 83 quotes match an archive copy word for word. The other 21 are from pages with no archive copy (the Launch Guide, Daily Hunt Limits, the fair voting article, How to share a scheduled launch, Product of the Day), apart from one scheduling quote whose wording changed after the archive copy (see the note under the table). Those 21 were re-checked by hand against the live text.

## Sources

Product Hunt Help Center (the date is the one shown on each article):

- Launch Guide, by Juan Francisco Secchi, "Updated over a week ago" (no date shown): https://help.producthunt.com/en/articles/17350772-launch-guide
- How to post a product, May 28, 2025: https://help.producthunt.com/en/articles/479557-how-to-post-a-product
- How can I get access to post?, July 30, 2025: https://help.producthunt.com/en/articles/481909-how-can-i-get-access-to-post
- Community Guidelines, April 11, 2025: https://help.producthunt.com/en/articles/3615694-community-guidelines
- Can I ask my community/friends/family to upvote a product?, February 10, 2025: https://help.producthunt.com/en/articles/484935-can-i-ask-my-community-friends-family-to-upvote-a-product
- How do I share my post?, February 21, 2025: https://help.producthunt.com/en/articles/2690626-how-do-i-share-my-post
- How does Product Hunt ensure fair voting and prevent spam or vote manipulation?, July 28, 2025: https://help.producthunt.com/en/articles/11869098-how-does-product-hunt-ensure-fair-voting-and-prevent-spam-or-vote-manipulation
- Why did my launch points go down?, May 30, 2025: https://help.producthunt.com/en/articles/4853541-why-did-my-launch-points-go-down
- Commenting Guidelines, July 28, 2025: https://help.producthunt.com/en/articles/10030102-commenting-guidelines
- How to schedule a post, February 2, 2026: https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post
- How to share a scheduled launch, June 30, 2026: https://help.producthunt.com/en/articles/15706445-how-to-share-a-scheduled-launch
- Hunter vs Makers and how to change them, February 10, 2025: https://help.producthunt.com/en/articles/10082986-hunter-vs-makers-and-how-to-change-them
- Daily Hunt Limits, April 3, 2026: https://help.producthunt.com/en/articles/14440291-daily-hunt-limits
- Product Hunt Featuring Guidelines, March 10, 2026: https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines
- Can I submit an unreleased product?, February 10, 2025: https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product
- Product of the Day, Week, & Month, July 10, 2025: https://help.producthunt.com/en/articles/11751186-product-of-the-day-week-month
- Can I relaunch my product?, July 7, 2026 when first read; "Updated this week" when re-read on 26 October 2026: https://help.producthunt.com/en/articles/484934-can-i-relaunch-my-product
- Maker's guide to Product Forums, May 28, 2025: https://help.producthunt.com/en/articles/11432379-maker-s-guide-to-product-forums

Product Hunt launch guide on producthunt.com (undated pages):

- How Product Hunt works: https://www.producthunt.com/launch/how-product-hunt-works
- Before launch: https://www.producthunt.com/launch/before-launch
- Preparing for launch: https://www.producthunt.com/launch/preparing-for-launch
- Sharing your launch: https://www.producthunt.com/launch/sharing-your-launch
- Launch Day duties: https://www.producthunt.com/launch/launch-day-duties
- Launch Day questions: https://www.producthunt.com/launch/launch-day-questions
- Days after your launch: https://www.producthunt.com/launch/days-after-launch

## Every quote on the page

| # | Quote (verbatim) | Source | Also in an Internet Archive copy |
| --- | --- | --- | --- |
| 1 | "Our community is made up of early adopters, makers, tech people, entrepreneurs, investors, and those who just love trying new products." | https://www.producthunt.com/launch/how-product-hunt-works | yes (2026-10-09) |
| 2 | "The homepage runs on a 24-hour cycle based on Pacific Standard Time." | https://www.producthunt.com/launch/preparing-for-launch | yes (2026-10-12) |
| 3 | "Your launch is eligible to be featured on the leaderboard for your launch day, where it competes with other products for the day's rank. After launch day, it keeps a permanent home on Product Hunt through your Product Page." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 4 | "By the time a product is visible on Product Hunt, we've thoroughly evaluated it multiple times." | https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines | yes (2025-12-28) |
| 5 | "Engagement Isn't Everything: While user engagement is important, it's not the sole factor in our featuring decisions." | https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines | yes (2025-12-28) |
| 6 | "The homepage leaderboard changes throughout the day based on the number of upvotes, comments, time since submission, and other factors. We can't give the exact details of how our algorithm works because doing so would make it easier to be gamed." | https://www.producthunt.com/launch/how-product-hunt-works | yes (2026-10-09) |
| 7 | "Points are a combination of upvotes and meaningful engagement (like comments or shares)." | https://help.producthunt.com/en/articles/11751186-product-of-the-day-week-month | no copy with this wording; live page only |
| 8 | "False. All upvotes are equal." | https://www.producthunt.com/launch/launch-day-questions | yes (2026-10-12) |
| 9 | "Product Hunt is free for everyone to use." | https://www.producthunt.com/launch/how-product-hunt-works | yes (2026-10-09) |
| 10 | "Ads can drive engagement with your product but these are separate from the leaderboard and rankings." | https://www.producthunt.com/launch/how-product-hunt-works | yes (2026-10-09) |
| 11 | "The product is new." | https://www.producthunt.com/launch/how-product-hunt-works | yes (2026-10-09) |
| 12 | "The product is usable." | https://www.producthunt.com/launch/how-product-hunt-works | yes (2026-10-09) |
| 13 | "Closed beta launches are usually not a good fit if it means our community can’t participate." | https://www.producthunt.com/launch/how-product-hunt-works | yes (2026-10-09) |
| 14 | "Live Products: We only feature products that are currently available." | https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines | yes (2025-12-28) |
| 15 | "Products that only offer an email sign-up are not eligible for the homepage." | https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product | yes (2026-04-11) |
| 16 | "Featured launches don’t need to score high in every category - often they spike in one or two of these." | https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines | yes (2025-12-28) |
| 17 | "A clear edge. Make it obvious how you stand apart from what's already out there." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 18 | "Waitlisted products (unless immediate access is provided)" | https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines | yes (2025-12-28) |
| 19 | "Value Over Monetization: We avoid featuring minimal, undifferentiated products that seem primarily focused on immediate monetization rather than providing long-term value." | https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines | yes (2025-12-28) |
| 20 | "Ultimately, the best time to launch your product is when you’re ready to do so." | https://www.producthunt.com/launch/preparing-for-launch | yes (2026-10-12) |
| 21 | "we ask Makers to wait at least two months between posts for the same product or from the same company." | https://help.producthunt.com/en/articles/484934-can-i-relaunch-my-product | no copy with this wording; live page only (re-read 2026-10-26; the 2026-10-12 copy says "six months") |
| 22 | "False. Everybody wants to be #1, but there are plenty of reasons to launch besides reaching the top of the leaderboard." | https://www.producthunt.com/launch/launch-day-questions | yes (2026-10-12) |
| 23 | "Care more about real engagement than numbers like point totals." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 24 | "Hunters post launches; Makers create them." | https://help.producthunt.com/en/articles/10082986-hunter-vs-makers-and-how-to-change-them | yes (2025-12-28) |
| 25 | "You'll need a personal account to post a product on Product Hunt. Company accounts cannot hunt or post products." | https://help.producthunt.com/en/articles/479557-how-to-post-a-product | yes (2026-02-09) |
| 26 | "Company or branded accounts cannot post, vote, or comment on Product Hunt." | https://help.producthunt.com/en/articles/481909-how-can-i-get-access-to-post | yes (2026-04-08) |
| 27 | "Once you've created a personal account, you will need to wait one week before you can post a product." | https://help.producthunt.com/en/articles/481909-how-can-i-get-access-to-post | yes (2026-04-08) |
| 28 | "If you're ready to post earlier than a week, you can subscribe to our newsletter for immediate access." | https://help.producthunt.com/en/articles/481909-how-can-i-get-access-to-post | yes (2026-04-08) |
| 29 | "One week is just a minimum, too; we highly recommend joining the platform well ahead of your launch (three months or more) and building a presence in the community." | https://www.producthunt.com/launch/before-launch | yes (2026-07-16) |
| 30 | "we require that profiles appear human and represent an individual, not a company, service, brand, or organization." | https://help.producthunt.com/en/articles/3615694-community-guidelines | yes (2025-12-28) |
| 31 | "Incomplete or misleading profiles may result in a higher chance of your contributions being reviewed, limited visibility, and/or the removal of contributions from the site." | https://help.producthunt.com/en/articles/3615694-community-guidelines | yes (2025-12-28) |
| 32 | "make sure they’ve created an account well before launch day so they can join the conversation and are credited for their hard work." | https://www.producthunt.com/launch/preparing-for-launch | yes (2026-10-12) |
| 33 | "Hunting is just posting. A hunter can be anybody with a personal Product Hunt account. That can be you, your co-makers, or an enthusiastic user." | https://www.producthunt.com/launch/before-launch | yes (2026-07-16) |
| 34 | "You can and should hunt your own product. There's no need for a special hunter." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 35 | "79% of featured posts were by makers who self-hunted" | https://www.producthunt.com/launch/before-launch | yes (2026-07-16) |
| 36 | "60% of #1 Product of the Day winners were self-hunted" | https://www.producthunt.com/launch/before-launch | yes (2026-07-16) |
| 37 | "There is no rule against using a hunter outside of your team, but paying people to hunt your product goes against our guidelines." | https://www.producthunt.com/launch/before-launch | yes (2026-07-16) |
| 38 | "Products caught breaking the rules will be unfeatured or removed and the makers associated with the product may be permanently banned from the site." | https://www.producthunt.com/launch/before-launch | yes (2026-07-16) |
| 39 | "Users can schedule up to 2 hunts per day through the Product Hunt platform." | https://help.producthunt.com/en/articles/14440291-daily-hunt-limits | no copy with this wording; live page only |
| 40 | "Let us know ASAP. We can remove the product and let the community member know a launch is on the way." | https://www.producthunt.com/launch/launch-day-questions | yes (2026-10-12) |
| 41 | "Every launch goes live at 12:01 AM Pacific on its scheduled date, so plan around that window." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 42 | "Posting at 12:01am PST gives people a full 24 hours to view your product." | https://www.producthunt.com/launch/preparing-for-launch | yes (2026-10-12) |
| 43 | "the day within 30 days of your current day for the post to go live." | https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post | no copy with this wording; live page only |
| 44 | "It will not be indexed on the site, and no users will be able to upvote it until the scheduled time." | https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post | yes (2025-12-28) |
| 45 | "By default, all scheduled launches are only visible by the Makers and product team members associated with the launch." | https://help.producthunt.com/en/articles/15706445-how-to-share-a-scheduled-launch | no copy with this wording; live page only |
| 46 | "You can save a draft anytime and pick up where you left off." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 47 | "Pick a day when you can be around for the key stretches, like the first few hours and your audience's peak time." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 48 | "never ask outright for upvotes or run anything that requires them. It breaks Product Hunt's rules and can get your launch disqualified." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 49 | "Please don't. People should upvote things they genuinely like or find interesting, not because they were peer pressured to do so." | https://help.producthunt.com/en/articles/484935-can-i-ask-my-community-friends-family-to-upvote-a-product | yes (2025-12-28) |
| 50 | "asking or incentivizing people to upvote may trigger the algorithm to drop the product in the ranks or remove it from the homepage entirely." | https://help.producthunt.com/en/articles/484935-can-i-ask-my-community-friends-family-to-upvote-a-product | yes (2025-12-28) |
| 51 | "Mass messaging users, asking for upvotes, using bots, incentivizing upvotes, and any other form of artificially increasing activity on your contribution is not acceptable." | https://help.producthunt.com/en/articles/3615694-community-guidelines | yes (2025-12-28) |
| 52 | "Don’t run contests that require upvotes or reward people for upvotes." | https://www.producthunt.com/launch/sharing-your-launch | yes (2026-06-10) |
| 53 | "If you continue doing so, we may unfeature your product." | https://www.producthunt.com/launch/sharing-your-launch | yes (2026-06-10) |
| 54 | "Product Hunt actively filters out inauthentic activity. This includes bot accounts, fake profiles, AI-generated actions, and any voting behavior that doesn’t match healthy, human community engagement." | https://help.producthunt.com/en/articles/4853541-why-did-my-launch-points-go-down | yes (2025-12-28) |
| 55 | "If points are removed, it’s because they didn’t come from legitimate users." | https://help.producthunt.com/en/articles/4853541-why-did-my-launch-points-go-down | yes (2025-12-28) |
| 56 | "Advise your audience to follow platform standards when creating accounts (such as a complete, personal account) and engaging with launches." | https://help.producthunt.com/en/articles/11869098-how-does-product-hunt-ensure-fair-voting-and-prevent-spam-or-vote-manipulation | no copy with this wording; live page only |
| 57 | "Avoid overtly coordinated campaigns that might appear artificial to detection systems." | https://help.producthunt.com/en/articles/11869098-how-does-product-hunt-ensure-fair-voting-and-prevent-spam-or-vote-manipulation | no copy with this wording; live page only |
| 58 | "Our community wants to talk to and hear from real people. No LLMs or Chrome extensions please!" | https://help.producthunt.com/en/articles/10030102-commenting-guidelines | yes (2025-10-18) |
| 59 | "Self-promoting in comments will also be removed." | https://help.producthunt.com/en/articles/3615694-community-guidelines | yes (2025-12-28) |
| 60 | "Ask for feedback, comments, opinions, help spreading the word, not for upvotes." | https://www.producthunt.com/launch/sharing-your-launch | yes (2026-06-10) |
| 61 | "Product Hunt’s ranking system considers more than just upvotes." | https://help.producthunt.com/en/articles/2690626-how-do-i-share-my-post | yes (2025-12-28) |
| 62 | "The gallery will need 2+ images before it is viewable." | https://help.producthunt.com/en/articles/479557-how-to-post-a-product | yes (2026-02-09) |
| 63 | "For videos, only YouTube links are supported." | https://help.producthunt.com/en/articles/479557-how-to-post-a-product | yes (2026-02-09) |
| 64 | "Shortened links (e.g. bit.ly) and track links (e.g. Google UTMs) are not accepted." | https://www.producthunt.com/launch/preparing-for-launch | yes (2026-10-12) |
| 65 | "There is no penalty for linking directly to your product, in actuality, we encourage it!" | https://www.producthunt.com/launch/launch-day-questions | yes (2026-10-12) |
| 66 | "Broadly, the three options are: free, paid, and paid (with a free trial or plan)." | https://help.producthunt.com/en/articles/479557-how-to-post-a-product | yes (2026-02-09) |
| 67 | "Shoutouts to the tools that helped you build it (in the Shoutouts field)" | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 68 | "You only get three shoutouts per product launch" | https://www.producthunt.com/launch/preparing-for-launch | yes (2026-10-12) |
| 69 | "When launch day arrives, show up and be present. Reply to comments quickly and honestly, and walk people through how and why you built it." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 70 | "Your two most important tasks on launch day are getting the word out, and being accessible to the community by responding to comments in real time or as close to it as possible." | https://www.producthunt.com/launch/sharing-your-launch | yes (2026-06-10) |
| 71 | "Engage like a human. Invite feedback instead of fishing for votes." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 72 | "will track your position, upvotes, comments, and reviews throughout the day (and after launch day)." | https://www.producthunt.com/launch/launch-day-duties | yes (2026-03-10) |
| 73 | "isn’t being penalized" | https://help.producthunt.com/en/articles/4853541-why-did-my-launch-points-go-down | yes (2025-12-28) |
| 74 | "Launch day is not a time to go spamming Reddit and Indie Hackers if you haven’t already been posting there" | https://www.producthunt.com/launch/sharing-your-launch | yes (2026-06-10) |
| 75 | "You should request access to edit your Product Page as soon as you launch." | https://www.producthunt.com/launch/launch-day-duties | yes (2026-03-10) |
| 76 | "Keep replying to comments for a few days afterward." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 77 | "Turn the best feedback into real improvements." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 78 | "You can promote your Launch Page for two weeks after launch day." | https://www.producthunt.com/launch/days-after-launch | yes (2026-02-24) |
| 79 | "Your Product Page is your permanent and comprehensive source of truth for your product." | https://www.producthunt.com/launch/days-after-launch | yes (2026-02-24) |
| 80 | "Every thread posted within a product forum notifies all of that product’s followers" | https://help.producthunt.com/en/articles/11432379-maker-s-guide-to-product-forums | yes (2025-12-28) |
| 81 | "Announce new updates in the Forums to reach new users." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 82 | "You can launch again every time you ship a major feature or update." | https://help.producthunt.com/en/articles/17350772-launch-guide | no copy with this wording; live page only |
| 83 | "New UIs, pricing plan changes, etc. are not considered significant updates." | https://help.producthunt.com/en/articles/484934-can-i-relaunch-my-product | yes (2026-10-12) |
| 84 | "Products that share the same root domain must adhere to a two-month submission gap." | https://help.producthunt.com/en/articles/484934-can-i-relaunch-my-product | no copy with this wording; live page only (added 2026-10-26; on the page it follows quote 21) |

Note on the scheduling quote ("the day within 30 days of your current day for the post to go live."): the live article, dated 2 February 2026, says "pick the day within 30 days of your current day". The archive copy from 28 December 2025 says "pick the day and time (in PST) within 30 days". The page quotes the live wording.

## Paraphrased claims and their sources

- Common reasons to launch (audience, feedback, validation, reviews, customers, funding, hiring, competitors): How Product Hunt works, "Why should I launch on Product Hunt?".
- The homepage shows featured products by default: How Product Hunt works, "Homepage leaderboard".
- Product of the Day, Week and Month go to the most points over the day, Monday to Sunday and the calendar month: Product of the Day, Week, & Month.
- Products with substantive updates since their last launch are a fit: How Product Hunt works, "What should I launch".
- Not featured: waitlisted products, templates, boilerplates, directories, courses, books, services, deal sites: Featuring Guidelines, "What We Don't Feature".
- Featured launches are looked at for being useful, novel, high craft or creative: Featuring Guidelines.
- Two launches from one company on the same day may be rescheduled: Featuring Guidelines, "Moderation Process", item 4.
- Before launch describes makers who ship early and makers who refine with beta testers first: Before launch, "Ready to launch?".
- The choice of when to launch depends on your goals: Before launch, "Ready to launch?" ("when you launch largely depends on your goals, your product, and even your own strategic style").
- Makers are added by Product Hunt username and tagged makers comment with a Maker badge: Preparing for launch ("Makers") and Hunter vs Makers.
- Two options when someone hunts you first: Launch Day questions.
- The sharing article's list of what to avoid (mass messages asking for upvotes, discounts or freebies for upvotes, coordinated voting): How do I share my post?.
- Product Hunt asks you to stop a contest that rewards upvotes before it unfeatures: Sharing your launch, "How NOT to market".
- Making a scheduled launch public from the lock icon: How to share a scheduled launch.
- Points dips are usually filters removing votes that weren't genuine ("in the vast majority of cases"): Why did my launch points go down?.
- Each launch creates a Launch Page and a Product Page: Launch Day duties.
- Relaunches within two months need a request, and products on the same root domain need the same two-month gap: Can I relaunch my product? (re-read 26 October 2026).

## Where Product Hunt's own pages disagree

- **Description length.** The Launch Guide and How to post a product say 260 characters. Preparing for launch says "Description (max 500 characters)". Since the QA cut, the post doesn't discuss the description; the checklist and the tagline guide both say 260.
- **Topics.** The Launch Guide and How to post a product say topics; Preparing for launch says "Launch tags". No longer discussed on the page after the QA cut.
- **How far ahead you can schedule.** How to schedule a post says "within 30 days"; Preparing for launch says "up to 1 month". The page says "up to about a month ahead" and quotes the help center.

## Left out

- **The checklist's steps.** Timed, step-by-step prep, launch-day actions and the week after stay on `/product-hunt-launch-checklist` (see Scope).
- **Listing fields the checklist already covers** (name, tagline, description, topics, thumbnail, gallery size, video, maker comment), and with them the first-comment figure ("70% of products that achieved Product of the Day, Week, or Month included a first comment by the maker."). Cut after Site QA (see Scope).
- **Day-of-week advice.** Preparing for launch says weekend launches get "15% more “Visit” button clicks than those on weekdays". It is Product Hunt's own figure, but it is undated, about clicks rather than outcomes, and the checklist already covers picking a day, so the post doesn't use it.
- **Other Product Hunt figures:** "About 53% of products that reached Product of the Day since 2021 include a video", "Less than a third of Product of the Day products used an animated GIF as a thumbnail", and "Typically a lead requires 10 marketing touches before they become a customer" (Days after your launch). Not needed for the post's scope, and the last one has no source on the page. The post keeps two Product Hunt figures, quoted verbatim, attributed and noted as undated: the self-hunting figures on the before launch page.
- **Time zone conversions** (Pacific time to UK time). Not stated by Product Hunt; the post gives only "12:01 AM Pacific".
- **How the ranking algorithm works in detail.** Product Hunt says it doesn't disclose it, and the post quotes that.
- **Hunter and maker email notifications** ("The Hunter's followers do not receive e-mail notifications of the post"). True to source, left out for length.
- **Company examples** in the Launch Guide and launch pages (Loom, Cursor, Clubhouse, Notion, Figma and others). Not needed, and they would read as endorsements.
- **Product Hunt's Terms of Service.** Not fetched, so not cited. The rules on the page come from the help center and launch guide only.
- **Any LaunchLoop metric or testimonial.** None used.
