# Source check: how to write a Show HN post, 20 October 2026

Requested by Arthur on Tuesday 20 October 2026 (LaunchLoop's Show HN day). Sources were fetched around 07:10 UTC the same day. Every quote on the page was copied from the fetched page, not from memory or a search snippet.

## Page

**URL:** `/how-to-write-a-show-hn-post`
**Title:** `How to write a Show HN post: title and text · LaunchLoop` (56 characters)
**Description:** `How to write a Show HN post from Hacker News's own rules: the title format, link or text post, what to say in your text, the tone, and how to reply.` (148 characters)

Targets "how to write a show hn post", with "show hn" as secondary. Keyword evidence supplied with the request (seodata.dev, US, monthly): "show hn" 260, "show hacker news" 70, "hacker news show hn" 40. Show HN title queries had no measurable volume (see also `2026-10-19-reddit-self-promotion-guide.md`, where `show hn title` returned HTTP 404 from seodata.dev and no Google autocomplete suggestions).

Scope split: `/show-hn-launch-checklist` stays the logistics page (eligibility, prep, timing, voting rules, after the launch). Its weak and stronger title examples and its first-comment outline moved to the new guide, and the checklist links to it from the title, first comment and replies sections.

## Method

- HN pages: `curl -A "Mozilla/5.0" https://news.ycombinator.com/<page>`, all HTTP 200.
- Moderator comments: found through the HN Algolia API (`https://hn.algolia.com/api/v1/search?tags=comment,author_dang&query=...`, same for `author_tomhow`), then each one fetched from `https://news.ycombinator.com/item?id=<id>` and checked for author, timestamp and wording.

## Sources and what was quoted

HN rules:

- https://news.ycombinator.com/showhn.html: "Show HN is for something you've made that other people can play with."; "To post, submit a story whose title begins with "Show HN"."; "blog posts, sign-up pages, newsletters, lists, and other reading material"; "Don't post landing pages or fundraisers."; "Explain how and why."; "make it easy for users to try your thing out, ideally without barriers such as signups or emails."; "A Show HN needn't be complicated or look slick."
- https://news.ycombinator.com/newsguidelines.html: "Please don't do things to make titles stand out, like using uppercase or exclamation points, or saying how great an article is."; "If the title includes the name of the site, please take it out, because the site name will be displayed after the link."; "If the title contains a gratuitous number or number + adjective, we'd appreciate it if you'd crop it."; "If you submit a video or pdf, please warn us by appending [video] or [pdf] to the title."; "unless it is misleading or linkbait; don't editorialize."; "Don't post generated text or AI-edited text. HN is for conversation between humans."; "Please respond to the strongest plausible interpretation of what someone says, not a weaker one that's easier to criticize. Assume good faith."; "Please don't post insinuations about astroturfing, shilling, brigading, foreign agents, and the like."; "Please don't comment about the voting on comments."; "Please don't use uppercase for emphasis. Instead, put *asterisks* around it and it will get italicized."
- https://news.ycombinator.com/newsfaq.html: "How do I make a link in a text submission?" / "You can't. This is to prevent people from submitting a link with their comments in a privileged position at the top of the page."; the `delay` setting: "It gives you time to edit your comments before they appear to others. Set it to the number of minutes you'd like. The maximum is 10."; "Dead posts aren't displayed by default".

Moderator comments (all verified on news.ycombinator.com):

| Item | Author, date (UTC) | Quoted |
| --- | --- | --- |
| [22336638](https://news.ycombinator.com/item?id=22336638) | dang, 2020-02-15, edited 2026-03-28 | Show HN tips: "Write your text by hand. Don't use an LLM to generate any of it (not even a tiny bit, including to edit or spruce it up)."; "Your text should show up at the top of the Show HN submission, but if for some reason it doesn't, add it as a first comment to the thread. Either way is fine."; "Include a clear statement of what your project is or does..."; "Include text giving the backstory..."; "Include links to any previous HN threads that are relevant. Readers like those."; "Drop any language that sounds like marketing or sales. On HN, that is an instant turnoff."; "Use factual, direct language. Personal stories and technical details are great."; "Make sure your friends and users do not add booster comments in the thread." Already cited by the checklist. |
| [22336296](https://news.ycombinator.com/item?id=22336296) | jam3sn, 2020-02-15 | Title only: "Show HN: Enkel – A clean and simple RSS Reader" (the thread the tips were posted on; quoted verbatim with its en dash). |
| [23263421](https://news.ycombinator.com/item?id=23263421) | dang, 2020-05-21 | "Users will flag the baity title and complain that it isn't clear what this is."; "make the title say in a neutral and direct way what this product/project is." |
| [27041703](https://news.ycombinator.com/item?id=27041703) | dang, 2021-05-04 | Changed "Show HN: I reverse engineered the Bose iOS app and rebuilt it for Mac" to the page's wording, "more informative anyhow". New title verified on story [27034904](https://news.ycombinator.com/item?id=27034904): "Show HN: Control your Bose headphones from your Mac's menubar". |
| [20773107](https://news.ycombinator.com/item?id=20773107) | dang, 2019-08-22 | "Make the submission link to your site, and add your text as a first comment to the new thread. (Don't make it a text post; those are penalized compared to posts with URLs.)" Dated on the page as 2019. |
| [27317842](https://news.ycombinator.com/item?id=27317842) | dang, 2021-05-28 | "For even better results, explain what problem you're solving and why it matters. What's the pain your product addresses?" |
| [46333434](https://news.ycombinator.com/item?id=46333434) | tomhow, 2025-12-20 | "showcasing an interesting project you’ve built (with a focus on technology discovery) rather than announcing a product people can buy."; "it’s not clear that this is something people can play with without paying anything." |
| [46704026](https://news.ycombinator.com/item?id=46704026) | tomhow, 2026-01-21 | "Show HN isn’t Product Hunt; it’s not for launching your product and capturing signups, it’s for showcasing interesting/deep innovation that others can learn from." |
| [46705186](https://news.ycombinator.com/item?id=46705186) | tomhow, 2026-01-21 | "a backstory, a real world problem that was causing real costs or difficulties for people" and the "a-ha" moment (paraphrased). |
| [47561124](https://news.ycombinator.com/item?id=47561124) | tomhow, 2026-03-29 | "has basically eaten everything that used to be interesting about most Show HN posts. I.e.: What were the obstacles to making it work? What approaches did you try that didn't work? What was the breakthrough that made it work? What do you learn?" |
| [49561867](https://news.ycombinator.com/item?id=49561867) | tomhow, 2026-09-04 | "your comments have been autokilled as our software classifies them as likely LLM-generated or edited/polished."; "The community here much prefers imperfect-but-authentic writing" |
| [49984080](https://news.ycombinator.com/item?id=49984080) | tomhow, 2026-10-06 | "We're fine with using LLMs for checking of spelling and grammar, and for suggesting improvements to text you've authored yourself, and then using your own human judgement to apply the changes back into your text."; "don't copy+paste something from an LLM chatbot or translation tool into the Hacker News comment box and submit it." |

## Left out

- **Title length limit.** Not stated on showhn.html, newsguidelines.html or newsfaq.html, so the page gives no character count.
- **Whether HN converts a spaced hyphen in titles to an en dash.** Not documented in the sources; the page only says any separator works.
- **When HN added the text field to link submissions.** Not documented, so the page doesn't say whether dang's 2019 text-post comment predates it; it is presented as his view at the time.
- **Current ranking effect of text-only posts.** Only the 2019 comment says it; the page dates it and leans on the FAQ's "You can't" instead.
- **Show HN volume and upvote figures** in tomhow's comments (for example "hundreds of Show HNs each day", "1000+ upvotes", "30 places on the front page"). True to source but not about writing the post, and the brief asked for no upvote numbers.
- **Best time to post, success rates, any statistics.** Not in the sources.
