# Source check: how to launch on Indie Hackers, 21 October 2026

Blog post for the new `/blog`, requested on Tuesday 20 October 2026. Sources were read the same day between about 17:35 and 18:00 UTC. Every quote on the page was copied from the fetched page, not from memory or a search snippet, and then checked again by script (see Method).

## Page

**URL:** `/blog/how-to-launch-on-indie-hackers`
**Title:** `How to launch on Indie Hackers: what to post · LaunchLoop` (57 characters)
**Description:** `How to launch on Indie Hackers from its founders' own advice: what the site is for, where to post, the self-promotion line and writing a post people answer.` (156 characters)
**H1:** How to launch on Indie Hackers. **Published and updated:** 2026-10-21 (the planned publish date in the brief; bump both in `src/lib/blog.ts` if it merges on another day). **Byline:** Lucien George.

Keyword data from the earlier research note (`2026-10-19-reddit-self-promotion-guide.md`): seodata.dev returned HTTP 404 (no data) for "how to launch on indie hackers" and "how to post on indie hackers", and Google autocomplete suggests "how to post on indie hackers" only as itself. No new lookups were made.

## How thin the primary sources are

Indie Hackers has no public rules page:

- `https://www.indiehackers.com/guidelines` returned HTTP 404 on 20 October 2026.
- `https://www.indiehackers.com/faq` returns the same page as `/about`.
- The homepage, `/products/new` and Channing Allen's June 2021 post asking for forum moderators showed a Cloudflare security check instead of the page, even through the fetch service. `/terms` showed the same check at first, then loaded live later on 20 October 2026 (see Method).

So the post rests on the About page, the terms of service, and six posts and comments by Courtland Allen from June 2019 to January 2022. That is enough for what the site is for, where to post and how to write a post. It is **thin on self-promotion**: there is no current, written rule, so that section says so, quotes the spam clause in the terms and the founder's 2019 advice, and labels the closing paragraph as our reading. The post also has a "What Indie Hackers doesn't document" section instead of guessing. Site QA should judge whether that is useful enough to publish.

`@csallen` is Courtland Allen's username: the About page signs off "Hello, I'm Courtland Allen. I created Indie Hackers. @csallen". His October 2019 reply in the milestones thread is posted as `csallen`.

## Method

- `curl` with a browser user agent: HTTP 403 with a Cloudflare challenge on every indiehackers.com URL. Playwright (Chromium headless, and Google Chrome headed) got the same challenge on producthunt.com and was not re-tried here.
- A server-side fetch service (Cursor's WebFetch) returned the About page and every Indie Hackers post cited below on 20 October 2026, with authors and dates. Indie Hackers posts use straight apostrophes, and the quotes keep them.
- The terms of service were first read from the Internet Archive's copy of 29 September 2026 (`http://web.archive.org/web/20260929071043/https://www.indiehackers.com/terms`), because the live page showed a security check. After Site QA reported that `/terms` loads, it was fetched live again on 20 October 2026: all three quoted clauses (the "spam" clause, the "offensive, defamatory, or inappropriate" clause and the "personal, non-commercial use" clause) match the live page word for word, so the post's Sources note no longer mentions the archive.
- Cross-check: every `<q>` on the page was searched for in the Internet Archive's latest copy of its source. 38 of the 44 quotes match word for word, including the two from the retired `/groups` page, which match the Internet Archive's 410 capture of 26 September 2026. The other 6 are from the December 2019 welcome post and the October 2019 milestones thread, which have no archive copy, and were re-checked by hand against the live text.

## Sources

- About Indie Hackers (live; also served at `/faq`): https://www.indiehackers.com/about
- Terms of Service (read live on 20 October 2026; also matches the Internet Archive copy of 29 September 2026): https://www.indiehackers.com/terms
- Courtland Allen, "How do you make a successful post on Indie Hackers?", June 18, 2019, and his replies in the comments on June 18 and 19, 2019: https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd
- Rosie Sherry, "What milestones should indie hackers be sharing?", October 14, 2019, with Courtland Allen's (`csallen`) reply of October 17, 2019: https://www.indiehackers.com/post/what-milestones-should-indie-hackers-be-sharing-5ff94ae08c
- Courtland Allen, "Welcome to Indie Hackers! (December 2019)": https://www.indiehackers.com/post/welcome-to-indie-hackers-december-2019-welcomeIntro-2019-12-01
- Courtland Allen, "Tips for making successful posts on Indie Hackers", March 7, 2020: https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a
- Courtland Allen, "Post a "Show IH" and appear on the Indie Hackers podcast", January 20, 2022: https://www.indiehackers.com/post/post-a-show-ih-and-appear-on-the-indie-hackers-podcast-0d304a166d
- Groups (retired; HTTP 410, read in Google Chrome on 20 October 2026): https://www.indiehackers.com/groups
- Product Hunt, "Sharing your launch" (for its line about Reddit and Indie Hackers): https://www.producthunt.com/launch/sharing-your-launch

## Every quote on the page

| # | Quote (verbatim) | Source | Also in an Internet Archive copy |
| --- | --- | --- | --- |
| 1 | "Indie Hackers is a place where the founders of profitable businesses and side projects can share their stories transparently, and where entrepreneurs can come to read and learn from those examples." | https://www.indiehackers.com/about | yes (2026-09-29) |
| 2 | "It's also a community where individual "indie hackers" come together to share their experiences, give and receive feedback, and rely on each other for support." | https://www.indiehackers.com/about | yes (2026-09-29) |
| 3 | "You're an indie hacker if you've set out to make money independently." | https://www.indiehackers.com/about | yes (2026-09-29) |
| 4 | "Indie hackers are tech founders who come here primarily to learn, talk shop, be inspired, discover new things, and (occasionally) lend a helping hand." | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 5 | "Start interesting discussions, ask useful questions, teach people what you've learned, and share links to relevant resources." | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 6 | "One-sided announcements are boring." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 7 | "Post milestones. I highly recommend creating a product page if you haven't already, and posting new milestones on a regular basis. Don't just share what you accomplished, but also share what you learned." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 8 | "Your product page is a great opportunity to get some practice building in public." | https://www.indiehackers.com/post/welcome-to-indie-hackers-december-2019-welcomeIntro-2019-12-01 | no copy with this wording; live page only |
| 9 | "a place to keep a log of your journey and accomplishments, both for yourself and for others." | https://www.indiehackers.com/post/what-milestones-should-indie-hackers-be-sharing-5ff94ae08c | no copy with this wording; live page only |
| 10 | "it's more for the important markers that you find meaningful than it is for, say, small daily tasks." | https://www.indiehackers.com/post/what-milestones-should-indie-hackers-be-sharing-5ff94ae08c | no copy with this wording; live page only |
| 11 | "the general idea is that it's a way to actually get attention on the entries you post to your product page." | https://www.indiehackers.com/post/what-milestones-should-indie-hackers-be-sharing-5ff94ae08c | no copy with this wording; live page only |
| 12 | "works in progress" | https://www.indiehackers.com/post/what-milestones-should-indie-hackers-be-sharing-5ff94ae08c | no copy with this wording; live page only |
| 13 | "Got some lessons or advice to share? Make a post on the forum." | https://www.indiehackers.com/post/welcome-to-indie-hackers-december-2019-welcomeIntro-2019-12-01 | no copy with this wording; live page only |
| 14 | "what you're working on (link to it!)" | https://www.indiehackers.com/post/post-a-show-ih-and-appear-on-the-indie-hackers-podcast-0d304a166d | yes (2024-01-18) |
| 15 | "how much revenue it's making" | https://www.indiehackers.com/post/post-a-show-ih-and-appear-on-the-indie-hackers-podcast-0d304a166d | yes (2024-01-18) |
| 16 | "It's also worth thinking about what makes your post interesting to other IHers." | https://www.indiehackers.com/post/post-a-show-ih-and-appear-on-the-indie-hackers-podcast-0d304a166d | yes (2024-01-18) |
| 17 | "Groups no longer exists." | https://www.indiehackers.com/groups | yes (2026-09-26) |
| 18 | "Indie Hackers retired this feature in 2026, and it's not coming back." | https://www.indiehackers.com/groups | yes (2026-09-26) |
| 19 | "Runs Maillist, Listserv, any form of auto-responder or "spam" on the Services" | https://www.indiehackers.com/terms | yes (2026-09-29) |
| 20 | "Submits, posts, or distributes any content that may be considered by Indie Hackers or its moderators as offensive, defamatory, or inappropriate." | https://www.indiehackers.com/terms | yes (2026-09-29) |
| 21 | "You will only use the Services for your own internal, personal, non-commercial use, and not on behalf of or for the benefit of any third party, and only in a manner that complies with all laws that apply to you." | https://www.indiehackers.com/terms | yes (2026-09-29) |
| 22 | "If you're just posting links to your blog, you won't find a lot of success." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 23 | "you should put the useful info in the tweet itself, not in a link to a blog post. Same on Indie Hackers." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 24 | "State their problems first, and put your solution/question/offer later." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 25 | "posts where people share their wins are actually quite helpful and popular for a reason!" | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 26 | "more details about how people had those wins and what they learned in the process." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 27 | "Launch day is not a time to go spamming Reddit and Indie Hackers if you haven’t already been posting there" | https://www.producthunt.com/launch/sharing-your-launch | yes (2026-06-10) |
| 28 | "Describe your post in the title using something close to a full sentence." | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 29 | "If you're asking a question, put your question in the title. If you're giving an opinion, put that in the title. If you're sharing advice, state the advice. If you're looking for feedback, say so." | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 30 | "How I figured out direct sales" | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 31 | "unless you have an extremely popular company with a recognizable name, it's almost never helpful to put your company's name in the title of your post." | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 32 | "Posts with questions in the title are more successful than posts without." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 33 | "Write as if nobody's going to read past the first 5 sentences, because in many cases, they won't." | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 34 | "You should start offering value in your post in the first few sentences." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 35 | "If someone opens up your posts and sees a giant wall of text, they're unlikely to engage" | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 36 | "Indie Hackers supports Markdown" | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 37 | "please, please, please put blank lines between them." | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 38 | "Agreed, good point." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 39 | "If you have a question, put it at the end on its own line with a clear question mark. If you have a link, again, put it at the end in its own paragraph." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 40 | "Our ranking algorithm rewards posts that generate discussion and have more comments." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 41 | "Indie Hackers rewards posts that generate the most discussion, because we want more people to see the best stuff." | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 42 | "Also, don't be shy about sharing posts on Twitter or with colleagues." | https://www.indiehackers.com/post/tips-for-making-successful-posts-on-indie-hackers-b04454a57a | yes (2022-10-25) |
| 43 | "on a regular basis" | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |
| 44 | "If at first you don't succeed, there's no law against coming back to try again." | https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd | yes (2020-11-17) |

## Dating old advice

Site QA asked for inline dates where 2019 and 2020 advice reads as current. Every bold lead in the self-promotion, writing and replies sections that rests on a founder tip now says which year, for example "(2019 tip)", "(2020 tip)", "(2019 and 2020 tips)" or "(2019 comment)". The replies section's first lead now reads "Comments lifted posts, according to the 2019 and 2020 tips", followed by a note that Indie Hackers' public pages don't say how ranking works today. The FAQ answers on titles and length now open with the year of the tips they come from.

## Paraphrased claims and their sources

- Created by Courtland Allen, with his brother Channing as co-founder: About ("I created Indie Hackers in August of 2016. In April of 2017 it was acquired by Stripe, and my brother, Channing, joined as a co-founder.").
- "The newest from 2022": the newest Indie Hackers post the page relies on is the January 2022 Show IH invitation.
- The 2020 tips' good and bad title examples ("Progress report #2933", "Promo", "My app"): Tips for making successful posts, section 2.
- A member complained in the comments about self-promotional posts, and Courtland Allen replied: comments by `alchemist` (June 18, 2019) and Courtland Allen (June 19, 2019) on the 2019 tips post.
- A member added that requests for help need enough context, and Courtland Allen replied "Agreed, good point.": comments by `louisswiss` and Courtland Allen (both June 18, 2019) on the 2019 tips post.
- A member asked what milestones are for: `louisswiss`, October 14, 2019, in the milestones thread.
- The 2020 tips suggest posting inside a relevant group: Tips for making successful posts, section 4. Indie Hackers has retired groups. `https://www.indiehackers.com/groups` returns HTTP 410 to a browser: Google Chrome (headed, via Playwright) loaded it at about 19:35 UTC on 20 October 2026 and showed "Error 410", "Groups no longer exists." and "Indie Hackers retired this feature in 2026, and it's not coming back." (straight apostrophe). The Internet Archive also has a 410 capture from 26 September 2026 (its last 200 capture, which still lists groups, is from 10 September 2026). Site QA reports that `curl` with a browser user agent now gets the HTTP 410 page directly. From the research VM, `curl` with a browser user agent (and with full Chrome request headers) still got a Cloudflare challenge (HTTP 403) at about 20:05 UTC on 20 October 2026, so whether Cloudflare challenges the request seems to depend on where it comes from; earlier the same day the fetch service reported HTTP 404. The quoted wording comes from the Chrome read and the archive capture, which agree word for word. The page now says "Indie Hackers retired groups in 2026", quotes both sentences verbatim, links `/groups` as the source and calls the advice out of date. Both quotes are in the table above.
- r/indiehackers is a subreddit with its own rules, including a limit on self-promotion: verified for the Reddit guide (`2026-10-19-reddit-self-promotion-guide.md`, rule 1: "Users can self promote their product 1 time using the Self Promotion flair."). The post links to `/how-to-promote-on-reddit` rather than quoting it again.

## Left out

- **Invite-only signups.** Search results show Courtland Allen's milestone "Started Requiring Invite Codes" and Channing Allen's link post dated August 2, 2021. The live milestone URL now opens the Indie Hackers product page without that milestone, the archived copy (22 September 2022) shows no date, and the current signup rules could not be checked. Dropped.
- **Channing Allen's June 2021 call for forum moderators.** Showed a security check when fetched, with no archive copy. Dropped.
- **The terms' "non-commercial use" clause** was left out of the first version as potentially misleading. After Site QA it is quoted in full, verbatim, with a note that the terms don't say how it applies to founders posting their own products and that Courtland Allen's posts encourage product pages and milestones. The FAQ mentions it in the same terms. The contact address cited for questions (contact@indiehackers.com) is the one the terms give.
- **Courtland Allen's 2019 survey figures** ("the top reasons people come to Indie Hackers are...", "The #1 reason cited ... is for inspiration and motivation"). No method or sample is given. Only the June 2019 reply about wins is quoted, not the ranking.
- **Member comments as rules.** The "more/less" list in the January 2019 thread "What kinds of posts would you like to see more/less of on Indie Hackers?" is by a member (Michael Lynch), not staff, so it isn't used. Member comments are mentioned only as the questions Courtland Allen was replying to.
- **Product page fields, milestone types, posting frequency limits, moderation process, new-account limits.** Not documented on any public Indie Hackers page that could be read. The post says so instead of describing them.
- **The "Build Board Beta" on `/products`.** Visible on the page but not explained anywhere, so not described.
- **Third-party guides** (venturelist.app, launchscaler.com, circlesaasboard.com, wheretosubmit.org). Found while searching; not primary, not used.
- **Any LaunchLoop metric or testimonial.** None used.
