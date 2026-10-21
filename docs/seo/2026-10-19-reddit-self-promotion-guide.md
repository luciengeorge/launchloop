# Topic research: launch-week guide, 19 October 2026

Research run on Monday 19 October 2026, around 07:15 UTC, to pick one new guide for founders in a launch week (LaunchLoop's Show HN is on Tuesday 20 October). Every request below can be re-run with the URL shown. The raw responses are at the end of this note.

## Decision

**Topic:** how to promote an app on Reddit without getting banned (Reddit and subreddit self-promotion rules).
**URL:** `/how-to-promote-on-reddit`
**Title:** `How to promote on Reddit: self-promotion rules · LaunchLoop` (59 characters)
**Description:** `How to promote your app on Reddit without getting banned: Reddit's self-promotion rules, how subreddit rules differ, and how to write a post that stays up.` (155 characters)

It is the only candidate cluster with measurable US volume in seodata.dev, and the only one where Google autocomplete suggests the founder phrasing ("how to promote your app on reddit", "how to promote on reddit without getting banned"). No existing LaunchLoop page targets Reddit.

## Method and rules

- Google autocomplete: `https://suggestqueries.google.com/complete/search?client=firefox&q=<query>`. An empty list means Google suggests nothing for that prefix.
- seodata.dev keyword API, anonymous tier (20 lookups a day, no key): `https://api.seodata.dev/v1/keyword?q=<query>&country=us`. A response with HTTP 404 and `"volume":0` means the keyword is not in its database. **That is recorded as "no data", not as zero searches.** Only volumes from HTTP 200 responses are quoted.
- The 20 seodata.dev lookups were spread across every candidate topic, so each one was tested at least once.
- Top-ranking pages come from a web search index on the same day, not from a rank tracker, so treat positions as indicative.

## seodata.dev volumes (US, monthly)

Quoted only where the API returned HTTP 200.

| Query | Volume | CPC (USD) | Source |
| --- | --- | --- | --- |
| how to promote on reddit | 70 | 8.37 | https://api.seodata.dev/v1/keyword?q=how+to+promote+on+reddit&country=us |
| reddit self promotion | 50 | 0 | https://api.seodata.dev/v1/keyword?q=reddit+self+promotion&country=us |
| reddit self promotion rules | 50 | 0 | https://api.seodata.dev/v1/keyword?q=reddit+self+promotion+rules&country=us |
| how to market on reddit | 50 | 13.73 | https://api.seodata.dev/v1/keyword?q=how+to+market+on+reddit&country=us |
| how to advertise on reddit for free | 20 | 101.93 | https://api.seodata.dev/v1/keyword?q=how+to+advertise+on+reddit+for+free&country=us |

Related keywords returned in the `similar` arrays of those responses (same source): reddit self-promotion rules 50, reddit self-promotion 50, self promotion reddit 40, self-promotion reddit 40, promote on reddit 30, promoting on reddit 30, reddit promotion 90, reddit promote 90, how to use reddit for marketing 70, reddit marketing strategy 110, reddit marketing 1000. "reddit marketing" and the "advertise" queries are broader or paid-ads intent, so the page does not target them.

**No data** (HTTP 404, not in the seodata.dev database): show hn title, show hn vs product hunt, hacker news vs product hunt, how to post on hacker news, how to launch on reddit, how to promote your app on reddit, how to promote on reddit without getting banned, how to promote saas on reddit, can you self promote on reddit, reddit 10 self promotion rule, best subreddits to promote your app, how to launch on indie hackers, how to post on indie hackers, launch week checklist, best time to post on hacker news.

## Google autocomplete, by candidate

- **How to write a Show HN title:** `show hn title`, `show hn title examples`, `how to write a show hn` and `hacker news post title` return no suggestions. `show hn` suggests rules, meaning, post and flagged, all covered by `/show-hn-launch-checklist`. No title-specific demand, and the checklist already has a title section. Rejected.
- **Show HN vs Product Hunt:** `show hn vs product hunt` returns nothing; `hacker news vs product hunt` suggests only reorderings of itself. No volume data. Rejected.
- **Launch-week checklist for Reddit and Indie Hackers:** `reddit launch checklist` returns nothing; `launch week checklist` drifts to "first week checklist". Rejected.
- **How to launch on Indie Hackers:** `how to launch on indie hackers` drifts to "how to start indie hacking" and "what is indie hackers"; `indie hackers self promotion` returns nothing. `how to post on indie hackers` suggests itself only. No volume data. Rejected as a standalone page; covered in a short section of the Reddit guide.
- **How to launch on Reddit:** `how to launch on reddit` suggests itself, then unrelated "how to open reddit" queries. The founder intent shows up under "promote" instead:
  - `how to promote on reddit` suggests "how to promote on reddit without getting banned", "how to market on reddit", "how to advertise on reddit for free".
  - `how to promote your app on reddit` suggests "how to promote my app on reddit", "how to market your app on reddit".
  - `how to promote saas on reddit` suggests "how to market your saas reddit", "how to market b2b saas reddit".
  - `reddit self promotion` suggests "reddit self promotion rules", "reddit self promotion guidelines", "reddit self promotion policy".
  - `reddit 10% rule` suggests "reddit 10 self promotion rule", "reddit 90 10 rule".
  - `how to post on reddit without getting banned` suggests "how to promote on reddit without getting banned".
  - `best subreddits to promote` suggests "best subreddits to promote your app".
  **Chosen**, targeting "how to promote on reddit" and "reddit self promotion rules", with "your app" and "without getting banned" in the description.

## Threads where founders ask the question

- r/SideProject: "How to promote on reddit without getting banned ?" https://www.reddit.com/r/SideProject/comments/1m6ilc5/how_to_promote_on_reddit_without_getting_banned/
- r/SaaS: "Every guide says 'post on Reddit' for marketing. But how do you actually do it without getting banned?" https://www.reddit.com/r/SaaS/comments/1rm9c63/every_guide_says_post_on_reddit_for_marketing_but/
- r/startups: "How to share your product on Reddit if every sub has 'no self-promo' rule?" https://www.reddit.com/r/startups/comments/17p0hqc/how_to_share_your_product_on_reddit_if_every_sub/
- r/iOSAppsMarketing: "How can i promote my app on Reddit ?" https://www.reddit.com/r/iOSAppsMarketing/comments/1rd9sl4/how_can_i_promote_my_app_on_reddit/
- Indie Hackers: "Is IH becoming too spam-y?" https://www.indiehackers.com/post/is-ih-becoming-too-spam-y-863f1cf339

## Top-ranking pages (web search index, 19 October 2026)

"how to promote on reddit without getting banned":
1. Reddit Help, Spam: https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam
2. r/languagelearning rules for promotion: https://www.reddit.com/r/languagelearning/wiki/rules_for_promotion/
3. Reddit Pro's organic playbook (PDF): https://redditinc.com/hubfs/Reddit%20Inc/Content/Reddit%20Pros%20organic%20playbook.pdf
4. r/languagelearning announcement: https://www.reddit.com/r/languagelearning/comments/1u537kp/announcement_we_are_tightening_the_rules_around/
5. r/GameAudio self-promotion rules: https://www.reddit.com/r/GameAudio/wiki/selfpromo/

"reddit self promotion rules 2026":
1. Reddit Help, Spam (as above)
2. ThreadFox, self-promotion rules for 3,845 subreddits: https://threadfox.vip/rules
3. r/ModSupport thread: https://www.reddit.com/r/ModSupport/comments/1rm7665/how_do_you_guys_handle_selfpromotions_in_your/
4. Reddit's old self-promotion guide: https://www.reddit.com/wiki/selfpromotion/
5. Soar Agency, rules by subreddit: https://www.soar.sh/blog/self-promotion-rules-by-subreddit-database

"how to promote your app on reddit":
1. Reddit for Business, Reddit marketing 101: https://www.business.reddit.com/learning-hub/articles/reddit-marketing-101
2. Refined, how to promote your MVP on Reddit: https://refined.so/blog/marketing-on-reddit
3. Reddit Pro's organic playbook (as above)
4. Popsy, 3 ways to promote your product on Reddit: https://popsy.ai/blog/3-ways-to-promote-your-product-on-reddit-without-getting-banned-(with-examples)
5. Soar Agency, how to promote your app on Reddit: https://www.soar.sh/blog/how-to-promote-your-app-on-reddit

The ranking pages are mostly Reddit's own policy pages and agency or tool blogs. Several of the blogs suggest tactics that break the rules (one suggests having "a friend" ask about your product). That leaves room for a page built only on the primary rules, with sources.

For comparison, "how to write a Show HN title" already returns the HN guidelines plus several title-formula pages (signals.sh, syften.com, a GitHub skill file), and LaunchLoop's Show HN checklist already has a title section.

## Primary sources used in the page

- Reddit Rules: https://redditinc.com/policies/reddit-rules
- Reddit Help, Spam (updated 6 October 2026): https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam
- Reddit Help, Disrupting Communities: https://support.reddithelp.com/hc/en-us/articles/360043066412-Disrupting-Communities
- Reddit Help, Content Moderation, Enforcement, and Appeals: https://support.reddithelp.com/hc/en-us/articles/23511059871252-Content-Moderation-Enforcement-and-Appeals
- Reddit's old self-promotion guide (marked no longer updated): https://www.reddit.com/wiki/selfpromotion/
- Reddit admins on the 10:1 guideline, r/modnews, December 2014: https://www.reddit.com/r/modnews/comments/2oamgp/moderators_clarifications_around_our_101/
- r/startups rules (Monthly Share Your Startup thread, stickied): https://www.reddit.com/r/startups/about/rules/
- r/webdev rules: https://www.reddit.com/r/webdev/about/rules/
- r/indiehackers rules and moderator post: https://www.reddit.com/r/indiehackers/about/rules/ and https://www.reddit.com/r/indiehackers/comments/1uzsfzy/community_reorganisation_new_posting_guidelines/
- r/languagelearning rules for promotion: https://www.reddit.com/r/languagelearning/wiki/rules_for_promotion/
- Courtland Allen, How do you make a successful post on Indie Hackers? (June 2019): https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd
- Hacker News guidelines: https://news.ycombinator.com/newsguidelines.html
- dang, Tips for presenting a Show HN: https://news.ycombinator.com/item?id=22336638

reddit.com returned HTTP 403 to `curl` from the research VM and timed out through a fetch proxy, so the subreddit rule text (r/startups, r/webdev, r/indiehackers) was read from search-index copies of those reddit.com pages. Site QA should open the three subreddit rule pages in a browser and confirm the wording before merge.

## Site QA review at a247a66, and follow-up

Site QA supplied the current rule wording for the changes made after review:

- r/webdev: "Commercial promotion still falls under rule #4 and is not allowed. Think project, not product." Rule 4 violations can lead to a ban.
- r/indiehackers rule 1: "Users can self promote their product 1 time using the Self Promotion flair." Posts mentioning MRR must include proof ("no proof, no post").
- r/startups: the rules now say "Monthly Share Your Startup thread", so the page no longer links the older quarterly thread.

Second Site QA pass, rule text as live on 21 October 2026:

- r/indiehackers rule 1 (checked 21 Oct 2026): "Users can self promote their product 1 time using the Self Promotion flair. The purpose is for feedback and critique not advertisement." The page quotes both sentences verbatim, the second without a comma, as Reddit has it.
- r/indiehackers rule 2, MRR (checked 21 Oct 2026): "no proof, no post".
- r/startups: the pinned thread is titled "Share your startup, quarterly post", while rule 2 still says "Monthly Share Your Startup thread". The page names the Share Your Startup thread, says the rules call it monthly, and does not link the pinned thread.
- The Reddit guide's `updated` date is now 2026-10-21; `published` stays 2026-10-19.

Dated claims checked against archived copies, because reddit.com and indiehackers.com return HTTP 403 to `curl` from the VM:

- r/modnews 10:1 clarification, December 2014: verified. The Wayback snapshot shows the post title "Moderators: Clarifications around our 10:1 self-promotional guidelines", author u/krispykrackers, `created-timestamp="2014-12-04T20:49:15.819000+0000"`, and the quoted text ("For every 1 time you post self-promotional content, 9 other posts (submissions or comments) should not contain self-promotional content." and "If someone exceeds the 10% that doesn't automatically make them a spammer!"). The post says "We made some small changes in our self-promotional wiki and our faq language", which only Reddit staff can do. Archive: http://web.archive.org/web/20250728232805/https://www.reddit.com/r/modnews/comments/2oamgp/moderators_clarifications_around_our_101/
- Courtland Allen, "How do you make a successful post on Indie Hackers?", June 2019: verified. The Wayback snapshot shows the author "Courtland Allen @csallen" and the date header "June 18, 2019" above the title. Archive: http://web.archive.org/web/20201117084401/https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd

## Raw responses

### Google autocomplete

```text
GET https://suggestqueries.google.com/complete/search?client=firefox&q=show%20hn%20title
["show hn title",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=show%20hn%20title%20examples
["show hn title examples",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20write%20a%20show%20hn
["how to write a show hn",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=show%20hn
["show hn",["show hn","show hn hacker news","show hn post","show hn rules","show hn meaning","show hn flagged"],[],{"google:suggestsubtypes":[[512],[512],[512],[512],[512],[512]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=show%20hn%20post
["show hn post",["show hn post","hacker news show hn post"],[],{"google:suggestsubtypes":[[512],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=show%20hn%20tips
["show hn tips",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=show%20hn%20best%20time
["show hn best time",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=best%20time%20to%20post%20on%20show%20hn
["best time to post on show hn",["best time to post show hn","what is the best time of the day to post on social media","whats the best time of day to post on social media"],[],{"google:suggestsubtypes":[[22,30],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=best%20time%20to%20post%20on%20hacker%20news
["best time to post on hacker news",["best time to post on hacker news"],[],{"google:suggestsubtypes":[[512]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20post%20on%20hacker%20news
["how to post on hacker news",["how to post on hacker news","how often can you post on hacker news","hacker news rules"],[],{"google:suggestsubtypes":[[512],[22,30],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=hacker%20news%20title
["hacker news title",["hacker news theme","hacker news headline dataset","whats another word for hacker"],[],{"google:suggestsubtypes":[[22,30],[22,30],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=hacker%20news%20post%20title
["hacker news post title",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=hacker%20news%20launch
["hacker news launch",["hacker news launch","launch hn hacker news","hacker news release date","hacker news product launch","hacker news nova launcher","launchdarkly hacker news","latest hacking news in india","hacker release date","hacker news rules"],[],{"google:suggestsubtypes":[[512],[22,30,10],[22,30],[22,30],[22,30],[22,30],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20launch%20on%20hacker%20news
["how to launch on hacker news",["how to launch on hacker news","hacker news startup ideas","latest hacking news in india","hacker news rules"],[],{"google:suggestsubtypes":[[512],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=launch%20hn
["launch hn",["launch hn","launch hn meaning","launch hn hacker news","hness launch date","hness launch year","hn007ws launch date in india","hnatyshyn launch grant","hntas launch","honda hness launch date","honda hness launch date in india"],[],{"google:suggestsubtypes":[[512],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=show%20hn%20vs%20product%20hunt
["show hn vs product hunt",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=hacker%20news%20vs%20product%20hunt
["hacker news vs product hunt",["hacker news product hunt","product hunt vs hacker news"],[],{"google:suggestsubtypes":[[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=launch%20week%20checklist
["launch week checklist",["first week checklist","launch schedule","product launch event examples"],[],{"google:suggestsubtypes":[[22,30],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=reddit%20launch%20checklist
["reddit launch checklist",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20launch%20on%20reddit
["how to launch on reddit",["how to launch on reddit","how to start on reddit","how to open reddit on browser","how to open reddit on chrome","how to open dms on reddit","how to open redgifs on reddit mobile","how to run ads on reddit","how to open redgifs on reddit","how to open incognito on reddit","how to start chat on reddit"],[],{"google:suggestsubtypes":[[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=launch%20on%20reddit
["launch on reddit",["launch reddit","launch and release difference","why is reddit not opening","launch an app meaning"],[],{"google:suggestsubtypes":[[22,30],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=reddit%20launch
["reddit launch",["reddit launch date","reddit launch","reddit launchbox","reddit launch school","reddit launch monitor","reddit launcher","reddit launchpoint","reddit launch date in india","reddit launcher android","reddit launched in india"],[],{"google:suggestsubtypes":[[512],[512],[512],[512],[512],[512],[512],[512],[512],[512]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=launch%20my%20app%20on%20reddit
["launch my app on reddit",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20promote%20on%20reddit
["how to promote on reddit",["how to promote on reddit","how to promote on reddit without getting banned","how to advertise on reddit","how to market on reddit","how to advertise on reddit for free","how to boost on reddit","how to promote someone on reddit","how to promote fansly on reddit","how to promote music on reddit","how to promote post on reddit"],[],{"google:suggestsubtypes":[[512],[512],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=promote%20on%20reddit
["promote on reddit",["promote on reddit","promote on tiktok reddit","promote music on reddit","promote post on reddit","promote book on reddit","promote app on reddit","promote fansly on reddit","promote business on reddit","promote on soundcloud reddit","promote instagram on reddit"],[],{"google:suggestsubtypes":[[512],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20market%20on%20reddit
["how to market on reddit",["how to market on reddit","how to advertise on reddit","how to promote on reddit","how to advertise on reddit for free","how to promote on reddit without getting banned","how to market research reddit","how to promote someone on reddit","how to promote music on reddit","how to promote post on reddit","how to promote on tiktok reddit"],[],{"google:suggestsubtypes":[[512],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20promote%20your%20app%20on%20reddit
["how to promote your app on reddit",["how to promote your app on reddit","how to promote my app on reddit","how to market your app on reddit","how to market my app on reddit","how to advertise your app reddit","how to promote on reddit","can you promote on reddit","how to promote a subreddit"],[],{"google:suggestsubtypes":[[512],[22,30],[22,30],[22,30],[22,30],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20promote%20saas%20on%20reddit
["how to promote saas on reddit",["how to promote saas on reddit","how to market saas on reddit","how to market your saas reddit","how to market b2b saas reddit","can you promote on reddit","how to promote on reddit","how to promote a subreddit"],[],{"google:suggestsubtypes":[[22,30],[22,30],[22,30],[22,30],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20promote%20your%20startup%20on%20reddit
["how to promote your startup on reddit",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20post%20on%20reddit%20without%20getting%20banned
["how to post on reddit without getting banned",["how to post on reddit without getting banned","how to promote on reddit without getting banned","how to promote onlyfans on reddit without getting banned","how to use reddit without getting banned","how to get banned on reddit","how to avoid reddit ban","how to know if you are banned on reddit"],[],{"google:suggestsubtypes":[[512],[22,30],[22,30],[22,30],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=reddit%20self%20promotion
["reddit self promotion",["reddit self promotion rules","reddit self promotion guidelines","reddit self promotion youtube","reddit self promotion policy","reddit self promo music","reddit music self promotion","reddit no self promotion","reddit twitch self promotion","reddit wiki self promotion","reddit book self promotion"],[],{"google:suggestsubtypes":[[512],[512],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=reddit%20self%20promotion%20rules
["reddit self promotion rules",["reddit self promotion rules","reddit self promotion guidelines","reddit self promotion policy","reddit 10 self promotion rule","can you self promote on reddit"],[],{"google:suggestsubtypes":[[512],[22,30],[22,30],[22,30],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=reddit%2010%25%20rule
["reddit 10% rule",["reddit 10 rule","reddit 90 10 rule","reddit running 10 rule","reddit 10 1 rule","reddit 60 30 10 rule","reddit 20 4 10 rule","reddit 10 self promotion rule"],[],{"google:suggestsubtypes":[[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=reddit%209%3A1%20rule
["reddit 9:1 rule",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=best%20subreddits%20to%20promote
["best subreddits to promote",["best subreddits to promote fansly","best subreddits to promote of","best subreddits to promote music","best subreddits to promote youtube videos","best subreddits to promote your app","best subreddits to promote indie game","best subreddit to promote your music","best subreddits to market for onlyfans","best subreddits to advertise of","best subreddits to increase karma"],[],{"google:suggestsubtypes":[[512],[512],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=subreddits%20to%20promote%20your%20startup
["subreddits to promote your startup",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=subreddits%20for%20startups
["subreddits for startups",["subreddits for startups","best subreddits for startups","subreddits for making money","how to start a subreddit","is there a subreddit for finding subreddits"],[],{"google:suggestsubtypes":[[22,30],[22,30],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=share%20your%20startup%20reddit
["share your startup reddit",["share your startup reddit"],[],{"google:suggestsubtypes":[[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=reddit%20marketing%20for%20startups
["reddit marketing for startups",["marketing for startups reddit"],[],{"google:suggestsubtypes":[[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20get%20users%20from%20reddit
["how to get users from reddit",["how to get customers from reddit","how to get users reddit","how to get user flair reddit","how to get user flair on reddit mobile","how to get user tags on reddit","how to get user flair on reddit pc","how to make user flair reddit","how to get first 100 users reddit","how to get users for your app reddit","how to get reddit user agent"],[],{"google:suggestsubtypes":[[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30],[22,30]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=where%20to%20launch%20my%20startup
["where to launch my startup",["where to launch my startup","where to launch your startup","how to start your own startup"],[],{"google:suggestsubtypes":[[22,30],[22,30],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=where%20to%20launch%20saas
["where to launch saas",["where to launch saas","how to launch a saas product","saas locations","how to host a saas application"],[],{"google:suggestsubtypes":[[22,30],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20launch%20on%20indie%20hackers
["how to launch on indie hackers",["how to start indie hacking","what is indie hackers","indie hackers revenue","indie hackers alternatives"],[],{"google:suggestsubtypes":[[22,30],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=indie%20hackers%20launch
["indie hackers launch",["indie hackers launch","indie hackers product launch","what is indie hackers","indie hackers revenue"],[],{"google:suggestsubtypes":[[22,30],[22,30],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=how%20to%20post%20on%20indie%20hackers
["how to post on indie hackers",["how to post on indie hackers","what is indie hackers","indie hackers alternatives","indie hackers review"],[],{"google:suggestsubtypes":[[512],[512,650,390],[512,650,390],[512,650,390]]}]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=indie%20hackers%20self%20promotion
["indie hackers self promotion",[]]

GET https://suggestqueries.google.com/complete/search?client=firefox&q=indie%20hackers
["indie hackers",["indie hackers","indie hackers discord","indie hackers community","indie hackers podcast","indie hackers reddit","indie hackers meaning","indie hackers iptv","indie hackers forum","indie hackers job board","indie hackers login"],[],{"google:suggestsubtypes":[[512,433],[512],[512],[512],[512],[512],[512],[512],[512],[512]]}]

```

### seodata.dev keyword API

```text
GET https://api.seodata.dev/v1/keyword?q=show+hn+title&country=us  -> HTTP 404
{"keyword":"show hn title","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=show+hn+vs+product+hunt&country=us  -> HTTP 404
{"keyword":"show hn vs product hunt","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=hacker+news+vs+product+hunt&country=us  -> HTTP 404
{"keyword":"hacker news vs product hunt","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=how+to+post+on+hacker+news&country=us  -> HTTP 404
{"keyword":"how to post on hacker news","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=how+to+launch+on+reddit&country=us  -> HTTP 404
{"keyword":"how to launch on reddit","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=how+to+promote+on+reddit&country=us  -> HTTP 200
{"keyword":"how to promote on reddit","volume":70,"cpc":8.37,"competition":0.33,"country":"us","cached":false,"cached_at":"2026-10-19T07:15:55.863Z","similar":[{"keyword":"how to promote of on reddit","volume":30,"cpc":22.12,"overlap":14},{"keyword":"promote on reddit","volume":30,"cpc":25.32,"overlap":11},{"keyword":"promotion on reddit","volume":30,"cpc":25.32,"overlap":11},{"keyword":"promote reddit","volume":30,"cpc":0,"overlap":9},{"keyword":"reddit promote","volume":90,"cpc":29.07,"overlap":8},{"keyword":"promoting on reddit","volume":30,"cpc":10.76,"overlap":7},{"keyword":"reddit promote post","volume":70,"cpc":7.08,"overlap":6},{"keyword":"reddit promotion","volume":90,"cpc":21.19,"overlap":5},{"keyword":"how to market on reddit","volume":50,"cpc":13.73,"overlap":5},{"keyword":"how to advertise on reddit","volume":210,"cpc":61.27,"overlap":4}]}

GET https://api.seodata.dev/v1/keyword?q=how+to+market+on+reddit&country=us  -> HTTP 200
{"keyword":"how to market on reddit","volume":50,"cpc":13.73,"competition":0.32,"country":"us","cached":false,"cached_at":"2026-10-19T07:15:57.740Z","similar":[{"keyword":"how to use reddit for marketing","volume":70,"cpc":39.92,"overlap":11},{"keyword":"reddit marketing","volume":1000,"cpc":24.83,"overlap":10},{"keyword":"marketing on reddit","volume":1000,"cpc":12.97,"overlap":9},{"keyword":"reddit for marketing","volume":1000,"cpc":12.97,"overlap":9},{"keyword":"using reddit for marketing","volume":70,"cpc":75.03,"overlap":8},{"keyword":"marketing reddit","volume":1000,"cpc":12.97,"overlap":7},{"keyword":"reddit marketer","volume":1000,"cpc":24.83,"overlap":7},{"keyword":"reddit marketing strategy","volume":110,"cpc":24.44,"overlap":7},{"keyword":"use reddit for marketing","volume":30,"cpc":28.43,"overlap":6},{"keyword":"reddit advertising","volume":12100,"cpc":19.22,"overlap":5}]}

GET https://api.seodata.dev/v1/keyword?q=how+to+promote+your+app+on+reddit&country=us  -> HTTP 404
{"keyword":"how to promote your app on reddit","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=how+to+promote+on+reddit+without+getting+banned&country=us  -> HTTP 404
{"keyword":"how to promote on reddit without getting banned","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=how+to+promote+saas+on+reddit&country=us  -> HTTP 404
{"keyword":"how to promote saas on reddit","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=reddit+self+promotion&country=us  -> HTTP 200
{"keyword":"reddit self promotion","volume":50,"cpc":0,"competition":0,"country":"us","cached":false,"cached_at":"2026-10-19T07:16:05.973Z","similar":[{"keyword":"reddit self-promotion","volume":50,"cpc":0,"overlap":20},{"keyword":"self-promotion reddit","volume":40,"cpc":0,"overlap":15},{"keyword":"self promotion reddit","volume":40,"cpc":0,"overlap":12},{"keyword":"reddit self-promotion rules","volume":50,"cpc":0,"overlap":11},{"keyword":"reddit self promotion rules","volume":50,"cpc":0,"overlap":10},{"keyword":"reddit promotion","volume":90,"cpc":21.19,"overlap":6},{"keyword":"promoting on reddit","volume":30,"cpc":10.76,"overlap":6},{"keyword":"reddit promote","volume":90,"cpc":29.07,"overlap":5},{"keyword":"promote on reddit","volume":30,"cpc":25.32,"overlap":5},{"keyword":"promotion on reddit","volume":30,"cpc":25.32,"overlap":5}]}

GET https://api.seodata.dev/v1/keyword?q=reddit+self+promotion+rules&country=us  -> HTTP 200
{"keyword":"reddit self promotion rules","volume":50,"cpc":0,"competition":0,"country":"us","cached":false,"cached_at":"2026-10-19T07:16:08.107Z","similar":[{"keyword":"reddit self-promotion rules","volume":50,"cpc":0,"overlap":16},{"keyword":"reddit self promotion","volume":50,"cpc":0,"overlap":10},{"keyword":"reddit self-promotion","volume":50,"cpc":0,"overlap":10},{"keyword":"self promotion reddit","volume":40,"cpc":0,"overlap":7},{"keyword":"self-promotion reddit","volume":40,"cpc":0,"overlap":7},{"keyword":"promotion on reddit","volume":30,"cpc":25.32,"overlap":4},{"keyword":"reddit spam rules","volume":20,"cpc":0,"overlap":4},{"keyword":"reddit promotion","volume":90,"cpc":21.19,"overlap":3},{"keyword":"how to promote on reddit","volume":70,"cpc":8.37,"overlap":3},{"keyword":"promote reddit","volume":30,"cpc":0,"overlap":3}]}

GET https://api.seodata.dev/v1/keyword?q=can+you+self+promote+on+reddit&country=us  -> HTTP 404
{"keyword":"can you self promote on reddit","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=reddit+10+self+promotion+rule&country=us  -> HTTP 404
{"keyword":"reddit 10 self promotion rule","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=best+subreddits+to+promote+your+app&country=us  -> HTTP 404
{"keyword":"best subreddits to promote your app","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=how+to+launch+on+indie+hackers&country=us  -> HTTP 404
{"keyword":"how to launch on indie hackers","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=how+to+post+on+indie+hackers&country=us  -> HTTP 404
{"keyword":"how to post on indie hackers","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=launch+week+checklist&country=us  -> HTTP 404
{"keyword":"launch week checklist","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=best+time+to+post+on+hacker+news&country=us  -> HTTP 404
{"keyword":"best time to post on hacker news","volume":0,"cpc":0,"competition":0,"country":"us","cached":false}

GET https://api.seodata.dev/v1/keyword?q=how+to+advertise+on+reddit+for+free&country=us  -> HTTP 200
{"keyword":"how to advertise on reddit for free","volume":20,"cpc":101.93,"competition":0.39,"country":"us","cached":false,"cached_at":"2026-10-19T07:16:23.789Z","similar":[{"keyword":"how to advertise on reddit","volume":210,"cpc":61.27,"overlap":9},{"keyword":"advertise on reddit","volume":9900,"cpc":36.71,"overlap":8},{"keyword":"reddit free-form ads","volume":110,"cpc":0,"overlap":8},{"keyword":"how to run ads on reddit","volume":30,"cpc":14.92,"overlap":8},{"keyword":"reddit ads","volume":12100,"cpc":19.22,"overlap":7},{"keyword":"reddit advertising","volume":12100,"cpc":19.22,"overlap":7},{"keyword":"reddit freeform ad","volume":30,"cpc":16.42,"overlap":7},{"keyword":"reddit ad formats","volume":140,"cpc":13.12,"overlap":6},{"keyword":"how do reddit ads work","volume":50,"cpc":37.84,"overlap":6},{"keyword":"can you advertise on reddit","volume":170,"cpc":15.62,"overlap":5}]}

```
