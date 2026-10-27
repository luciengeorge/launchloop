# Source check: Show HN title checker, 27 October 2026

Sources were fetched on Tuesday 27 October 2026 (2026-10-27) at about 09:10 UTC. Every quote on the page and in `src/lib/show-hn-check.ts` was copied from the fetched HTML, not from memory, a search snippet or an older quote log. Copies of the fetched pages are in `tests/fixtures/hn/2026-10-27/`, and `tests/unit/show-hn-check.test.ts` checks every quote word for word against them (whitespace collapsed, HTML entities decoded).

## Page

**URL:** `/tools/show-hn-title-checker`
**Title:** `Show HN Title Checker: Test Against HN Rules · LaunchLoop` (57 characters)
**Description:** `Free Show HN title checker: test your title and first comment against Hacker News's own rules, each quoted and linked to its source. No AI, no sign-up.` (151 characters)

The checker runs in the browser (no server action, no AI, no account). It reads a title, an optional text or first comment, and what the link goes to (something to try, a video or a PDF). It returns pass or warn per check. Each check is labelled either **HN rule** (it enforces a quoted HN sentence) or **Our tip** (LaunchLoop's own heuristic).

## Method

- `curl -sSL -A "Mozilla/5.0" https://news.ycombinator.com/<page>` for `showhn.html`, `newsguidelines.html`, `newsfaq.html` and `submit`, all HTTP 200.
- Quotes copied from the HTML, with line breaks collapsed to single spaces and `&quot;` read as `"`. Straight apostrophes and quotes kept as HN writes them.
- Sizes as fetched: showhn.html 2,682 bytes, newsguidelines.html 5,864, newsfaq.html 9,171, submit 1,169.

## Quotes

### Show HN guidelines

**URL:** https://news.ycombinator.com/showhn.html

| Key | Exact text | Used by |
| --- | --- | --- |
| `prefix` | To post, submit a story whose title begins with "Show HN". | `prefix` (rule) |
| `upgrades` | New features and upgrades ("Foo 1.3.1 is out") generally aren't substantive enough to be Show HNs. A major overhaul is probably ok. | `upgrade` (rule) |
| `offTopic` | Off topic: blog posts, sign-up pages, newsletters, lists, and other reading material. | `offtopic` (rule) |
| `notReady` | If your work isn't ready for users to try out, please don't do a Show HN. | `offtopic` (rule) |
| `landing` | Don't post landing pages or fundraisers. | `offtopic` (rule) |
| `askFriends` | Please don't ask friends to upvote or comment. That's not ok on HN. | `asks` (rule) |
| `easyToTry` | Please make it easy for users to try your thing out, ideally without barriers such as signups or emails. | `signup` (rule) |
| `howWhy` | Explain how and why. | `howwhy` (tip) |
| `playWith` | Show HN is for something you've made that other people can play with. | page copy only |
| `nonTrivial` | The project should be non-trivial. Don't post quickly-generated one-offs; anybody can do that now. | page copy only |
| `personal` | The project must be something you've worked on personally and which you're around to discuss. | page copy only |

### Hacker News guidelines

**URL:** https://news.ycombinator.com/newsguidelines.html

| Key | Exact text | Used by |
| --- | --- | --- |
| `titles` | Please don't do things to make titles stand out, like using uppercase or exclamation points, or saying how great an article is. | `caps` (rule), `exclaim` (rule), `hype` (rule) |
| `siteName` | If the title includes the name of the site, please take it out, because the site name will be displayed after the link. | `domain` (rule) |
| `number` | If the title contains a gratuitous number or number + adjective, we'd appreciate it if you'd crop it. | `number` (rule) |
| `numberException` | Exception: when the number is meaningful, e.g. "The 5 Platonic Solids." | `number` (rule) |
| `media` | If you submit a video or pdf, please warn us by appending [video] or [pdf] to the title. | `media` (rule) |
| `solicit` | Don't solicit upvotes, comments, or submissions. | `asks` (rule) |
| `emphasis` | Please don't use uppercase for emphasis. Instead, put *asterisks* around it and it will get italicized. | `emphasis` (rule) |
| `generatedPosts` | Please don't put generated text in HN posts. | page copy only |
| `generatedComments` | Don't post generated text or AI-edited text. HN is for conversation between humans. | page copy only |
| `editorialize` | Otherwise please use the original title, unless it is misleading or linkbait; don't editorialize. | page copy only |

### Hacker News FAQ

**URL:** https://news.ycombinator.com/newsfaq.html

| Key | Exact text | Used by |
| --- | --- | --- |
| `penalty` | We penalize or ban submissions, accounts, and sites that break this rule, so please don't. | `asks` (rule) |

### Submit form

**URL:** https://news.ycombinator.com/submit

Signed out, the page shows only "You have to be logged in to submit." and a login and create-account form. No title field or length limit is visible, so none is quoted.

## How each check maps to a quote

| Check | Kind | Quote keys | What the code looks for |
| --- | --- | --- | --- |
| `prefix` | rule | `prefix` | Title begins with `Show HN` in that case. Lowercase `show hn` warns. |
| `caps` | rule | `titles` | All-caps words of 4+ letters, or shouted short words (NEW, NOW, ALL...), except an acronym allow-list (JSON, HTTP, YAML...). |
| `exclaim` | rule | `titles` | Any `!` after the prefix. |
| `hype` | rule | `titles` ("saying how great an article is") | Our word list: best, greatest, ultimate, amazing, awesome, incredible, insanely, revolutionary, game-changing, groundbreaking, mind-blowing, world's first, world-class, cutting-edge, next-level, blazing fast, lightning fast, stunning, magical, killer, epic, unbelievable. The page says the list is ours. |
| `domain` | rule | `siteName` | A domain-like token (gridcast.app, www.x.com). `.js`, `.rs`, `.md`, `.so` are not treated as domains. |
| `number` | rule | `number`, `numberException` | A number before a listicle noun (ways, reasons, tips...) or before a hype adjective. "The 5 Platonic Solids" passes. |
| `media` | rule | `media` | If the user says the link is a video or a PDF, the title must end with `[video]` or `[pdf]`. |
| `upgrade` | rule | `upgrades` | `v2`, a three-part version like `1.3.1`, or "is out", "now supports", "new version", "now available", "just released". Two-part versions (Python 3.12) pass. |
| `offtopic` | rule | `offTopic`, `notReady`, `landing` | "my/our waitlist", "join the waitlist", "my/our newsletter", "my/our blog post", "my/our landing page", fundraiser, crowdfunding, Kickstarter, Indiegogo, pre-order, "coming soon", in the title or text. A waitlist *tool* passes. |
| `asks` | rule | `askFriends`, `solicit`, `penalty` | Upvote, vote for us, please vote or comment, leave a comment, comment below, support us on HN, help us reach the front page, show some love, in the title or text. Asking for feedback passes. |
| `signup` | rule | `easyToTry` | Text mentions signing up, logging in, creating an account or an email address, in a sentence with no negation ("no sign-up needed" passes, "you can't try it without signing up" warns). |
| `emphasis` | rule | `emphasis` | All-caps words in the text, same allow-list as `caps`. |
| `describes` | tip | none | Fewer than 3 words after `Show HN:`. Labelled "Our tip, not an HN rule". |
| `howwhy` | tip | `howWhy` | Text contains because, why, how, problem, backstory, "I built/made/wrote/started/wanted/needed/was" or "the idea". Labelled as our guess; it can't tell whether the text explains anything. |

Page-only quotes (not checks): `playWith`, `nonTrivial`, `personal`, `generatedComments` and `editorialize` in "What no checker can judge", and `generatedPosts` after that list.

## Original element

Each check is tied to the exact HN sentence it enforces, quoted and linked, and the test suite verifies every quote against the copies of HN's pages fetched on 27 October 2026. Every before and after example on the page (made-up products: Gridcast, Ledgerline, a split keyboard build) is run through `checkShowHn` in the same test file: each "before" must fail exactly the checks the page lists, and each "after" must pass every check.

## Left out

- **Title length limit.** Not stated on showhn.html, newsguidelines.html or newsfaq.html, and the submit form needs a login. The tool shows a neutral character count and the page says no limit is stated. No number is given.
- **dang's Show HN tips** (`item?id=22336638`, linked from showhn.html) and other moderator comments. Not one of the three rules pages, so not quoted on this page; `/how-to-write-a-show-hn-post` covers them with its own quote log (`2026-10-20-show-hn-post-guide.md`).
- **"don't editorialize" and linkbait.** No reliable pattern, so listed under "What no checker can judge" instead of being checked.
- **Generated or AI-edited text.** Can't be detected without AI, so it is quoted as a rule to check yourself, not a check.
- **The colon after "Show HN".** HN's rule only says the title begins with "Show HN", so the checker doesn't require a colon.
