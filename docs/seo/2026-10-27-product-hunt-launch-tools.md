# Source check: Product Hunt launch tools, tested on one repo, 27 October 2026

Blog post for `/blog`, from the outline of Sunday 25 October 2026 (`2026-10-25-outline-best-product-hunt-launch-tools.md`) with Arthur's changes of 27 October, and the GitHub-repo-to-launch-copy brief of 26 October folded in as a section. The first-party test ran on Tuesday 27 October 2026 between 10:07 and 10:20 Paris time (CET, UTC+1). Every tool, pricing and Product Hunt quote on the page was read on the source's own page that morning between 10:07 and 10:09 Paris (`pages27/00-quotes.md`), and every generated text on the page is copied from the raw test outputs. Nothing was signed up for, bought, submitted or posted. No PostHog or traffic figures are used.

## Page

**URL:** `/blog/product-hunt-launch-tools`
**Title:** `Product Hunt launch tools, tested on one repo · LaunchLoop` (58 characters; metaTitle 45, inside the 37 to 46 house range)
**Description:** `Looking for the best Product Hunt launch tools? We ran one open-source repo through 10 free tiers and checked the copy and images against Product Hunt specs.` (157 characters)
**H1:** Product Hunt launch tools, tested on one repo. **Published and updated:** 2026-10-27 (bump both in `src/lib/blog.ts` if it merges on another day). **Byline:** Lucien George. **Reading time:** 21 minutes (4,114 words in the rendered body at 200 words a minute, counted the way `tests/e2e/blog.spec.ts` counts: the innerText of `article > div`, split on whitespace; the e2e suite recounts it).

"Best" appears only in the meta description and the first FAQ question, where it is answered per job rather than with a pick. There are no scores, rankings, winner or percentages (n = 10).

## Target queries

From the outline, not re-queried (0 OpenSEO credits):

- "best product hunt launch tools" and "product hunt launch tools": no data (OpenSEO, Google US, 20 October 2026). The title leads with "Product Hunt launch tools"; "best" is in the description and the FAQ.
- "product hunt launch kit": no data (OpenSEO, 20 October 2026). In an H2 ("What the free tiers left out of a Product Hunt launch kit") and an FAQ question.
- "GitHub repo to launch copy": from the 26 October brief, no volume looked up. In an H2 ("GitHub repo to launch copy: one repo, side by side") and an FAQ question.
- "product hunt gallery image size / 1270x760": FAQ only.

## Method

- **Repo and inputs, frozen at 10:07 Paris before any run** (`pht-test/00-inputs.md`): repo https://github.com/emilkowalski/sonner, MIT (`LICENSE.md` saved), commit `8e4662b39255120b62138312058f5d77c0139a5e` (main HEAD at freeze time, committed 2026-08-10 11:13 UTC; main was still at it after the run). Homepage for website tools: https://sonner.emilkowal.ski, read live on the test day. Text blurb: the README's first paragraph, verbatim, link markup removed: "Sonner is an opinionated toast component for React. You can read more about why and how it was built here." Screenshot for image tools: `2026-10-27_input_homepage_1440x900.png`. README, package.json and LICENSE at the commit are saved as `README_at_<sha>.md`, `package.json_at_<sha>.json` and `LICENSE_at_<sha>.md`; they are the source of every repo fact on the page.
- **Rules:** free tier only, no card, first output only, one run per tool, one retry on an error (recorded), never post or submit anything.
- **Counting:** `Array.from(text.trim()).length`, the rule in `src/lib/limits.ts` (`charLength`). Every count on the page was recomputed from the raw outputs with that rule; where a tool showed its own count, ours is used and the difference, if any, is stated. Emoji count as one code point.
- **Images:** pixel sizes were read from the downloaded files (PIL for batch 2, run by Arthur; `file` for LaunchLoop's three images, see the test log), not from tool labels.
- **Quotes:** every `<q>` on the page was checked by script (normalised whitespace, JSX entities decoded) against `pages27/00-quotes.md`, the raw output files and the saved repo files: 59 quotes, 59 found word for word. `00-quotes.md` was itself machine-checked against the saved HTML and WebFetch copies on 27 October at about 10:10 Paris (160 strings; see its "Verification" section). `tests/unit/blog.test.ts` fails if the page quotes anything that isn't in the table at the end of this file.
- **Dashes:** the article has no en or em dashes, and neither does this log: in the raw outputs below each U+2014 is written `[U+2014]` and each U+2013 `[U+2013]`. Quotes stop before, or avoid, source text with a dash (StartKitz's plan bullets, ShipProof's "Free tool" badge, PH LaunchKit's "the PH limit" line, Screenhance's yearly price, Product Hunt's tagline sentence past the parenthesis, Marketing Pack's "Free plan" line). Lines with a percentage sign, such as ShipProof's and PH LaunchKit's "100% free", are not quoted, so the page has no percentages at all.

## Tools tested, and why

The ten from the outline, all run on 27 October 2026. None needed a card or an account, so none was skipped.

| Tool | Job | Input it took | Why it is in |
| --- | --- | --- | --- |
| LaunchLoop free preview (ours) | Copy and images | Repo URL | Ours, disclosed in the lede and before the FAQ; same rules |
| StartKitz | Copy | Website URL | Named by ChatGPT and Gemini for "Product Hunt launch kit" in the 26 October AI check |
| ShipProof | Copy | Typed text | Free, no signup, writes PH copy |
| PH LaunchKit | Taglines | Typed text | Free, no account, 8 PH taglines |
| ChatGPT Free, logged out | Copy | Typed text (blurb and repo URL) | Baseline: what a general AI gives |
| Screenhance | Gallery images | Screenshot | Free plan, PH gallery generator |
| Mydentify | Images | Website URL | Free, no account, lists a 1270x760 PH image |
| Perspecto | Gallery images | Screenshot | Free, no sign-up, PH preset |
| WhixFrame | Gallery images | Screenshot | Free no-signup gallery tool |
| Marketing Pack | Copy and images | Website URL | One free pack every 30 days, PH copy and images |

## Tools left out, and why

- **Overnight Cut, Simple App Shipper, LaunchCopy, LaunchNudge, Repomix.** From the 26 October brief, found after the test list was fixed on 25 October, so not run. The page describes each in one or two lines from its own page (`pages27/00-quotes.md`, section 3): input, free tier, account. Simple App Shipper and LaunchCopy need an account; LaunchNudge is a waitlist with no free tier stated; Repomix writes no copy itself; Overnight Cut is free and writes PH copy, and the page says so.
- **The outline's other left-outs** (LaunchPact, Uprows Hub, Notra, gittomarket, AgentLaunch, Canva). Their facts were read on 25 October and not re-read on the test day, so the page doesn't name them or repeat those facts. It says only that general design tools, directory submission services, commit-to-social tools without PH output, and tools whose free tier couldn't be confirmed on their own pages were left out.
- **Account-only parts of tested tools** (WhixFrame's AI version, "3 free credits on signup"; Perspecto's email trial). Not used, under the free-tier rule.

## Gaps the page states instead of guessing

- **Why ShipProof's output described ShipProof.** The page states the fact (the form showed our inputs; the output was about ShipProof; no error) and that one run can't say whether it always happens. No cause is suggested.
- **Why Mydentify errored.** The page gives the error text and the one retry. The tester's guess in the raw note is not used.
- **LaunchLoop's paid description and maker comment.** Not bought, so not tested; the page says so in the table, the LaunchLoop section, the repo section and the FAQ.
- **ChatGPT's prompt wording.** The output file records the inputs (blurb and repo URL) but not the exact prompt; the page says only what it was given.
- **Marketing Pack's account requirement.** Not verifiable from its pages on 27 October (`00-quotes.md`); in the run it asked for no email or sign-in, which is what the page says.
- **Maker comment limit.** No Product Hunt page read on 27 October gives one, so the page gives maker comment counts without a pass or fail. Marketing Pack's own "up to 2,000 characters" is quoted as its page's claim, not as Product Hunt's.

## Paraphrased claims and their sources

- 1270x760 is about 1.67:1 (1270 / 760 = 1.671); 16:9 at 1270 wide is 714.4 tall. Arithmetic, as in the outline.
- "Some pages call the gallery size 16:9": outline, section 3 (WonderLaunch's asset resizer, search result of 25 October). Not named on the page.
- Sonner's package.json facts (name sonner, version 2.0.8, MIT, homepage, keywords react, notifications, toast, snackbar, message; React 18 and 19 in peerDependencies) and README facts (opening sentence, link to a post on why and how it was built, `npm install sonner`, `<Toaster />`, `toast()`): the saved files at the commit.
- "built-in animations" and "customization" aren't in the README or package.json at the commit: searched both files (no "animat" or "custom" in either).
- LaunchLoop's brief gave v2.0.8: raw output ("Latest ship: v2.0.8") against package.json `"version": "2.0.8"`.
- Marketing Pack's maker comment says the documentation covers positions, promises, loading states and themes: raw output ("The documentation covers ... promise and loading states ... themes, positioning ...").
- The LaunchLoop paid kit adds the PH description and maker comment, the rest of the X thread, landing copy, a LinkedIn post and unwatermarked images: the LOCKED line of the LaunchLoop raw output.
- Screenhance's download screen: watermark-free exports at $12 a month or a $6 one-time pass: raw output ("Remove the watermark: Unlimited with Pro $12/mo or Pass $6 one-time").
- Screenhance's watermark was tiled diagonally: raw output ("diagonal tiled \"Made with Screenhance\" across image"), against its pricing page's "small ... mark in the bottom corner".
- StartKitz labelled its 79-character tagline long and showed the count: raw output ("LONG (79 chars)").
- Overnight Cut gives the description limit as 500: `00-quotes.md` ("a description of 500 or fewer").
- Simple App Shipper takes typed fields and an optional App Store or landing URL: `00-quotes.md`, section 3.
- Repomix is MIT-licensed: `00-quotes.md` ("Released under the MIT License.").

## Test log

First-party test, run on Tuesday 27 October 2026, Paris time (CET, UTC+1). One run per tool, first output only. Screenshots stay on file and are not in the repo; filenames are as listed in the output files. Raw outputs are copied from the output files with three substitutions only: U+2014 is written `[U+2014]`, U+2013 `[U+2013]`, and the email address of the founder's LaunchLoop account is replaced with a description.

### LaunchLoop free preview (ours)

- **Time (Paris, CET):** 10:07 to 10:09
- **Input:** Repo URL https://github.com/emilkowalski/sonner (main at the pinned commit).
- **Counts (ours, `Array.from(text.trim()).length`):** Tagline 54 (tool showed 54/60; match). Brief one-liner 111. First X post 253 code points (not checked against X's weighted count; not used on the page). No description, no maker comment (locked, paid kit). Images: `og` 1200x630, `x` 1600x900, `ph` 1270x760, all with a PREVIEW watermark and a "Free preview · launchloop.dev" badge, the observation the page gives under What we noticed.
- **Screenshots and files:** `2026-10-27_launchloop_image_og.png`, `_x.png`, `_ph.png` (listed in the output file). Pixel sizes: the saved files weren't in the batch, so the three PNGs were downloaded again from the kit's image routes (`https://launchloop.dev/api/og/dIemCR9Us6mshoORqQ3VHg/{og,x,ph}`) on 27 October 2026 at 10:17 Paris and read with `file`: 1200 x 630, 1600 x 900, 1270 x 760.
- **Raw output** (`2026-10-27_launchloop_output.txt`, verbatim except as noted at the top of this section):

```text
LaunchLoop free preview. Start 2026-10-27 10:07 Paris (CET), end 10:09 Paris. Kit URL: https://launchloop.dev/kit/dIemCR9Us6mshoORqQ3VHg
(Browser was already signed in as [the founder's LaunchLoop account]; no sign-up done.)

PRODUCT HUNT TAGLINE (54/60):
Toast notifications for React with built-in animations

PRODUCT BRIEF:
Sonner
An opinionated toast component for React that handles notifications with built-in animations and customization.
Who it's for: React developers who need to display toast notifications in their applications.
Problem it solves: Developers need a reliable way to show temporary notifications to users without building toast UI and behavior from scratch. Managing multiple toasts, animations, and user interactions adds complexity to every project.
Features we found:
- Multiple toast types with customizable options and styling
- Position control with swipe direction that adapts to placement
- Visible toasts limit through visibleToasts prop
- Support for multiple toasters with unique identifiers
- Custom aria labels for accessibility
- Hotkey support for dismissing toasts
Proof points: 13,089 GitHub stars; 3 commits in the last month; Latest ship: v2.0.8; Open source (MIT)
Stack: React
Brand colours: #0f1627 #3b82f6 #ffffff #a4a6ad

FIRST X POST (unlocked sample, post 1 of thread):
I built Sonner, a toast component for React.

It handles notifications, animations, positioning, and accessibility out of the box. 13k+ GitHub stars, MIT licensed.

No more building toast UI from scratch for every project.

https://sonner.emilkowal.ski/

IMAGES: 2026-10-27_launchloop_image_og.png, _x.png, _ph.png
LOCKED: Landing copy, PH post (description, topics, maker comment), X thread posts 2+, LinkedIn, no-watermark images, checklist, ZIP: "Unlock the full kit, £19"
```

### StartKitz

- **Time (Paris, CET):** 10:09 to 10:10
- **Input:** Website URL https://sonner.emilkowal.ski only.
- **Counts (ours, `Array.from(text.trim()).length`):** Taglines: 25, 32, 79 (tool showed 25, 32, 79; match). 1 of 3 over 60. No PH description or maker comment (Launch Copy locked).
- **Screenshots and files:** None listed in the output file.
- **Raw output** (`2026-10-27_startkitz_output.txt`, verbatim except as noted at the top of this section):

```text
StartKitz free preview (https://startkitz.com/preview/117). Input: website URL only. Start 2026-10-27 10:09 Paris, end 10:10 Paris (about 1 min). No account/card.
No Product Hunt tagline/description/maker comment in the free output (Launch Copy is locked).

ONE-LINERS (5)
OUTCOME: Sonner helps React developers integrate customizable notifications by offering flexible toast options.
FOR-WHO: Flexible toast notifications for React developers finalizing their web apps.
PAIN (Recommended): Frustrated with limited toast customization? Sonner solves that.
REPLACE: Sonner is like a custom toolkit [U+2014] without the integration headaches.
SPEED: Custom notifications in 60 seconds. Directly integrates with React.

TAGLINES (3)
SHORT (25 chars): Custom Toasts, Simplified
MEDIUM (32 chars): Customize React toasts with ease
LONG (79 chars): Effortless notification customization for React developers seeking flexibility.

LAUNCH SCORE: 54/100 "Great tool, but it’s shouting into the void."
Biggest issue: Weak pitch fails to showcase unique value. Fix: Revise the hero headline to highlight customization benefits.
Best angle: Tailored toast notifications for React developers, not generic tools.
Growth report top issue: Vague one-sentence pitch; top opportunity: r/reactjs subreddit. "9 findings unlocked with Starter"
Positioning snapshot: Your most likely buyer is a React developer needing customizable toast notifications to enhance user experience [U+2014] their challenge is managing notifications effectively while maintaining design consistency.
Headline variants: [PAIN] Control your toast notifications to reduce user confusion. / [OUTCOME] Create notifications that match your app's style and needs. / [CONTRAST] Old notifications clutter your UI; Sonner helps you design with ease.
Hero block: Sonner allows React developers to integrate customizable toast notifications, tailoring styles and positions to fit their projects. Manage different notification types like success and error with ease. CTA: Customize My Notifications Now
TWITTER/X: Tired of generic toast notifications cluttering your React app? Sonner gives you the control you need to customize notifications to fit your style. Check it out!
LINKEDIN: As a React developer, I always struggled with toast notifications. They never fit my app's design or needs. That's why I created Sonner [U+2014] a customizable solution that lets you manage notifications effortlessly. Explore what it can do for your projects.
REDDIT: I used to waste time trying to integrate toast notifications in my React apps. They never looked right or worked as I needed. I recently discovered Sonner, and it's a game changer for managing notifications. If you’re in the same boat, you should check it out!
(Free preview posts shown blurred in the screenshot but text readable in page.)

LOCKED: "Your free preview is unlocked. The full kit has 16 more assets [U+2014] competitor analysis, 10 X posts, 5 LinkedIn posts, 6 Reddit drafts, ad creatives, email sequence, and more." Button "Log in to unlock"; "16 more assets locked"; "Starter [U+2014] from $9"; plans Starter $19 "Get Starter [U+2014] $19", Creator $39, Launch $99. "Unlock to reveal". Decode [U+2014] $7.
```

### ShipProof AI Launch Copy Generator

- **Time (Paris, CET):** 10:12 to 10:14
- **Input:** Typed: name Sonner; one-line pitch = blurb; problem = blurb; target audience React developers; features and story blank; platforms default (PH, X, Reddit).
- **Counts (ours, `Array.from(text.trim()).length`):** Tagline 43. Description 588 (9 lines; over 260 and over 500). Maker comment 370. All about ShipProof, not Sonner. No count shown by the tool.
- **Screenshots and files:** None listed in the output file; screenshots of the filled form and the output are on file with Arthur.
- **Raw output** (`2026-10-27_shipproof_output.txt`, verbatim except as noted at the top of this section):

```text
ShipProof AI Launch Copy Generator. Start 2026-10-27 10:12 Paris, end 10:14 Paris. No account/card. First output only (no regenerate).
Inputs: name=Sonner; One-line pitch=blurb; Problem=blurb; Target audience=React developers; features/story blank; platforms default (PH, X, Reddit).
!! OFF: output is about ShipProof itself (its own placeholder/demo copy), not Sonner. Inputs ignored (form had shown them filled). No error shown.

== PRODUCT HUNT ==
TAGLINE: Turn every launch into lasting social proof
DESCRIPTION:
ShipProof is the all-in-one launch toolkit for indie hackers.

🚀 Ship [U+2014] Generate platform-ready launch copy for PH, Reddit, HN, Twitter/X, and IndieHackers with AI. What used to take a full Sunday now takes 2 minutes.

📥 Collect [U+2014] Paste a tweet URL, a PH comment, or a Reddit reply. ShipProof pulls in the content, attributes the source, and tags it. Never lose great feedback again.

📊 Display [U+2014] Embed a Wall of Love on your landing page with two lines of code. Auto-scrolling marquee, masonry grid, or carousel [U+2014] your pick.

Each cycle makes your next launch stronger. Start free today.
MAKER COMMENT:
Hey PH! 👋

I built ShipProof because I kept losing great comments people left about my projects. Someone would praise my tool on Twitter, I'd screenshot it, then lose the file. Sound familiar?

ShipProof closes the loop: generate launch content → collect praise → display it everywhere.

The free plan gives you everything to try the full flow. Would love your feedback!
FIRST COMMENT:
Thanks for checking out ShipProof! Happy to answer any questions about the product, tech stack (Next.js + Go + Claude API), or my experience launching as a solo founder. 🙌

== TWITTER / X LAUNCH THREAD ==
🧵 I just launched ShipProof [U+2014] the all-in-one launch toolkit for indie hackers.

It turns every launch into lasting social proof.

Here's the story 👇

---

1/ The problem: Every time I launched something, I spent an entire Sunday writing posts for 5 different platforms.

Then the good comments came in... and I lost them in browser tabs.

---

2/ ShipProof fixes this with a flywheel:

🚀 Ship [U+2014] AI generates platform-ready copy for PH, Reddit, HN, Twitter, IndieHackers
📥 Collect [U+2014] Paste a URL, it pulls the content automatically
📊 Display [U+2014] Embed a Wall of Love on your site

---

3/ The best part? Each launch cycle makes the next one stronger.

More social proof → more trust → more users → more feedback → repeat.

---

4/ It's free to start:
✅ 1 product
✅ 5 proofs
✅ AI launch copy generation
✅ Wall of Love page
✅ Embeddable widget

No credit card required.

---

5/ Try it now → shipproof.io

I'd love your feedback. What platform do you struggle with most when launching? 👇

== REDDIT ==
TITLE: I built a tool that generates launch posts for 5 platforms and collects social proof automatically
BODY:
Hey everyone,

I've been building in public for a while and one thing always frustrated me: writing launch posts.

Every platform has different expectations. Product Hunt wants polished descriptions. Reddit wants authenticity. HN wants technical depth. Twitter wants hooks. IndieHackers wants the story.

Writing for all of them used to take me an entire Sunday.

So I built ShipProof.

**What it does:**
- Generates platform-specific launch copy using AI (not generic cross-posting)
- Collects praise/testimonials [U+2014] paste a URL and it pulls the content
- Displays social proof on your site with a 2-line embed code

**The idea is a flywheel:** Ship → Collect → Display → Ship again (with more proof each time).

**It's free to start** [U+2014] 1 product, 5 proofs, AI generation included.

I'd love feedback from this community. What could be better? What's missing?

Link: shipproof.io
```

### PH LaunchKit tagline generator

- **Time (Paris, CET):** 10:12
- **Input:** Typed: name Sonner, category Developer Tools, audience React developers, blurb.
- **Counts (ours, `Array.from(text.trim()).length`):** 8 taglines: 37, 40, 45, 48, 46, 43, 41, 48 (tool's counts match all 8). 0 over 60. Longest 48.
- **Screenshots and files:** None listed in the output file.
- **Raw output** (`2026-10-27_phlaunchkit_output.txt`, verbatim except as noted at the top of this section):

```text
PH LaunchKit tagline generator. Start 2026-10-27 10:12 Paris, end 10:12 Paris. No account/card ("Sign in to save" optional). Inputs: name Sonner, category Developer Tools, audience React developers, blurb. First output only. 8 options:
1. Ship polished React toasts in minutes (37/60)
2. Turn app events into clear user feedback (40/60)
3. Opinionated React toasts that just feel right (45/60)
4. Turn notifications into a better user experience (48/60)
5. Beautiful toast messages for modern React apps (46/60)
6. Drop in React toasts with sensible defaults (43/60)
7. Fast, elegant toasts for React developers (41/60)
8. React toast notifications without the setup pain (48/60)
```

### ChatGPT, logged out

- **Time (Paris, CET):** 10:13
- **Input:** Typed: the blurb and the repo URL. The prompt's exact wording isn't in the output file.
- **Counts (ours, `Array.from(text.trim()).length`):** Tagline 53 (UI showed 43/60). Description 193 (UI showed 143/260). Maker comment 716. Within 60 and 260 either way.
- **Screenshots and files:** None listed in the output file.
- **Raw output** (`2026-10-27_chatgpt_output.txt`, verbatim except as noted at the top of this section):

```text
ChatGPT logged out (chatgpt.com, no login, rejected non-essential cookies). Start 2026-10-27 10:13 Paris, end 10:13 Paris. First reply only.
Chat worked logged out (URL /uc/...). UI labelled each block "Writing" and claimed "43/60 characters" for tagline and "143/260" for description.

Product Hunt listing: Sonner
Tagline: Beautiful toast notifications for React, made simple.
Description: Meet Sonner, an opinionated toast component for React. Create beautiful, customizable notifications with a delightful developer experience and minimal setup. Just install, integrate, and toast!
Maker comment:
Hey Product Hunt! 👋

I built Sonner because toast notifications should be simple to implement and delightful to use.

Sonner is an opinionated toast component for React, designed to look great out of the box without making you spend hours tweaking styles. It's easy to set up, flexible when you need it, and built to make notifications feel like a natural part of your app.

Whether you're showing a quick success message, surfacing an error, or keeping users informed about an ongoing action, Sonner makes it easy.

I'd love for you to give it a try! Check out the repo, share your feedback, and let me know what you'd like to see next.

GitHub: https://github.com/emilkowalski/sonner

Thanks for checking it out! 🚀
```

### Screenhance

- **Time (Paris, CET):** 10:13 to 10:14
- **Input:** Screenshot `2026-10-27_input_homepage_1440x900.png`; first template PH Sorbet Launch, stock text left in.
- **Counts (ours, `Array.from(text.trim()).length`):** 1 PNG, 1270x760 (measured with PIL by Arthur), watermark tiled diagonally. No copy.
- **Screenshots and files:** `2026-10-27_screenhance_export1.png`, `2026-10-27_screenhance_export_modal.png`, `2026-10-27_screenhance_editor.png`.
- **Raw output** (`2026-10-27_screenhance_output.txt`, verbatim except as noted at the top of this section):

```text
Screenhance - start 10:13:06 Paris, end ~10:14:33
Did: product-hunt-gallery-generator -> "Create a Product Hunt gallery" -> first/default template "PH Sorbet Launch" (3 pages, 1270x760). Uploaded input image into the phone mockup frame. Download -> modal -> "Download first PNG free" (Current page, 1x PNG, Watermarked, "No sign-in needed"). Left "Export all 3 pages" toggle as default; only one PNG came down. Template headline text left as default ("Launch day, made lovely." / "Live on Product Hunt" / "Everything your product needs to shine, in one calm place.") - not edited.
Pre-editor wall: "A quick check before you create ... Complete the check to continue." (auto-passed, no interaction).
Account/card: none needed. Wording: "Current page · 1x PNG · Watermarked · No sign-in needed".
Paid wording: "Remove the watermark: Unlimited with Pro $12/mo or Pass $6 one-time"; "Clean exports · $6 one-time - 10 watermark-free exports · 7 days · No subscription"; "Unlimited clean exports · $12/mo"; GIF/Video/WEBP/JPEG/2x/3x/transparent bg show crown (locked).
Watermark: YES, diagonal tiled "Made with Screenhance" across image.
Files: 2026-10-27_screenhance_export1.png (1270x760), 2026-10-27_screenhance_export_modal.png, 2026-10-27_screenhance_editor.png
Errors: none (console showed minor errors).
```

### Mydentify Launch Asset Pack

- **Time (Paris, CET):** 10:14 to 10:15
- **Input:** Website URL https://sonner.emilkowal.ski (the tool takes a URL only).
- **Counts (ours, `Array.from(text.trim()).length`):** No output: error "Input buffer contains unsupported image format" on the first attempt and the one retry. The tester's guess at the cause, in the raw note, is not used on the page.
- **Screenshots and files:** `2026-10-27_mydentify_error.png`.
- **Raw output** (`2026-10-27_mydentify_output.txt`, verbatim except as noted at the top of this section):

```text
Mydentify Launch Asset Pack - start ~10:14:40 Paris, end 10:15:07
Did: entered https://sonner.emilkowal.ski in Website URL, clicked "Build asset pack". Tool offers URL only (no image upload). 
Error (exact, both attempts, retried once): "Input buffer contains unsupported image format"
Page said "No account required"; "Uses the public logo and social image already on your site." (Sonner likely has no/odd og image -> sharp error). Nothing generated, no ZIP.
Files: 2026-10-27_mydentify_error.png
```

### Perspecto

- **Time (Paris, CET):** 10:15 to 10:17
- **Input:** Screenshot; Product Hunt template, size Product Hunt 1270x760, 1x, default transparent background.
- **Counts (ours, `Array.from(text.trim()).length`):** 1 PNG, 1270x760 (PIL), small "via perspecto.io" watermark. No copy.
- **Screenshots and files:** `2026-10-27_perspecto_export1.png`, `2026-10-27_perspecto_editor.png`.
- **Raw output** (`2026-10-27_perspecto_output.txt`, verbatim except as noted at the top of this section):

```text
Perspecto - start ~10:15:10 Paris, end 10:17:03
Did: perspecto.io -> Choose an image -> uploaded input image -> Angle template "Product Hunt" (Bold tilt for launch galleries) -> Export tab -> Size "Product Hunt 1270x760", resolution 1x, background Transparent (default) -> Export PNG 1x -> Export preview dialog -> "Save PNG" (file name default 2026-10-27_input_homepage.png).
Note: first attempt accidentally loaded image into "second image" slot of the demo; reloaded and redid cleanly. Final export is single image.
Account/card: none ("Free · no sign-up"). No Pro email trial accepted.
Watermark: YES, small "via perspecto.io" bottom-right; dialog said "Product Hunt Gallery · 1x standard quality · watermark on · Get up to 4x, no watermark ->". "3 free exports left today · Pro is unlimited". Pro $19 ("Upgrade to Pro - $19"). 2x/4x, iMac/Display/Curved frames, brand colours locked (PRO).
Note: exported with transparent background, so the PNG is a white-ish tilted screenshot on transparency (views white in some viewers).
Files: 2026-10-27_perspecto_export1.png, 2026-10-27_perspecto_editor.png
```

### WhixFrame

- **Time (Paris, CET):** 10:17
- **Input:** Screenshot; browser frame, Product Hunt gallery 1270x760, first background; headline and subheadline typed by us; address bar left at acme.com.
- **Counts (ours, `Array.from(text.trim()).length`):** 1 PNG, 1270x760 (PIL), "Made with whixframe.com" watermark. No copy.
- **Screenshots and files:** `2026-10-27_whixframe_export1.png`, `2026-10-27_whixframe_editor.png`.
- **Raw output** (`2026-10-27_whixframe_output.txt`, verbatim except as noted at the top of this section):

```text
WhixFrame free Product Hunt gallery tool - start 10:17:10 Paris, end 10:17:34
Did: uploaded input image; defaults: Browser frame, address bar text left as default "acme.com", size Product Hunt gallery 1270x760, mockup size 82, background first/default (ember). Edited headline to "Toast notifications for React" and subheadline to "Sonner is an opinionated toast component for React." (defaults were "Ship faster with Acme" / "The feature that matters, in one line"). Clicked "Download PNG (1270×760)".
Account/card: none ("100% free, runs in your browser ... No signup").
Watermark: YES, bottom-right "Made with whixframe.com". Upsell: "Want AI backgrounds and no watermark? ... 3 free credits on signup."
Files: 2026-10-27_whixframe_export1.png (1270x760), 2026-10-27_whixframe_editor.png
Errors: none. Caveat: browser bar still reads acme.com.
```

### Marketing Pack

- **Time (Paris, CET):** 10:18 to 10:19
- **Input:** Website URL https://sonner.emilkowal.ski; free monthly pack; no email or sign-in asked.
- **Counts (ours, `Array.from(text.trim()).length`):** Tagline 28. Description 162 (within 260 and 500). Maker comment 465 with its "Draft: personalize this maker comment before posting." line (Markdown `> ` marker not counted), 411 without it. 1 PH gallery image 1270x760 (PIL), no visible watermark. Brand detected as Emil Kowalski.
- **Screenshots and files:** `2026-10-27_marketingpack_result.png`, `2026-10-27_marketingpack_modal.png`, `2026-10-27_marketingpack_ph_gallery_01-homepage.png`, `2026-10-27_marketingpack_pack.zip`.
- **Raw output** (`2026-10-27_marketingpack_output.txt`, verbatim except as noted at the top of this section):

```text
Marketing Pack - start ~10:18:00 Paris, end 10:19:42 (generation took ~1.5 min)
Did: getmarketingpack.com/#generate-pack, URL https://sonner.emilkowal.ski -> "Generate Marketing Pack" -> modal "Here is what you will receive ... use your included monthly credit or purchase an additional pack for $5." -> "Generate free pack". No email, sign-in, password, Google, code or magic link asked. A Cloudflare Turnstile ran invisibly. Pack at private link https://getmarketingpack.com/packs/467f898b-97d3-4d66-83d5-ed36367b853c ("Marketing pack complete", "Free plan - 1 free pack every 30 days - Resets 11/26/2026", "Files available until 1/25/2027"). Downloaded ZIP.
Brand name it detected: "Emil Kowalski" (not Sonner).
Files: 2026-10-27_marketingpack_pack.zip; extracted to 2026-10-27_marketingpack_zip/marketing-pack/ (12 files); 2026-10-27_marketingpack_ph_gallery_01-homepage.png (1270x760, the only PH gallery image, a plain homepage screenshot, no watermark visible); also reference/ screens (homepage + 5 pages), x/homepage.png; screenshots 2026-10-27_marketingpack_result.png, _modal.png

--- Product Hunt (launch-copy.md) verbatim ---
Tagline: Opinionated toasts for React
Description: Sonner is an opinionated React toast component with configurable positions, types, actions, promises, loading states, custom content, themes, and styling options.
Maker comment: > Draft: personalize this maker comment before posting.
Sonner is a toast component for React. Add the Toaster component to your app, then call toast to render notifications. The documentation covers standard and custom toasts, actions and cancel options, promise and loading states, updating and dismissing toasts, multiple toasters, themes, positioning, callbacks, and styling. A headless approach is available when you need full control over the markup and styles.

--- common.md ---
Tagline: Opinionated toasts for React
Short description: Sonner is an opinionated toast component for React. Add a Toaster to your app, then render default, success, info, warning, error, action, promise, loading, or custom toasts. Configure position, expansion, visible toasts, themes, offsets, icons, callbacks, and styling[U+2014]or use the headless approach for full control.
Overview: (see 2026-10-27_marketingpack_zip/marketing-pack/content/common.md)

--- x/post.md ---
Sonner is an opinionated toast component for React. Add a Toaster, then render default, success, error, loading, promise, action, or custom toasts. Configure position, expansion, themes, icons, callbacks, and styling[U+2014]or use the headless approach... (full: content/x/post.md) Attachment: homepage.png
```


## Sources

- Product Hunt, Launch Guide: https://help.producthunt.com/en/articles/17350772-launch-guide
- Product Hunt, How to post a product: https://help.producthunt.com/en/articles/479557-how-to-post-a-product
- Product Hunt, Preparing for launch: https://www.producthunt.com/launch/preparing-for-launch
- Sonner at commit 8e4662b: https://github.com/emilkowalski/sonner/tree/8e4662b39255120b62138312058f5d77c0139a5e (licence: https://github.com/emilkowalski/sonner/blob/8e4662b39255120b62138312058f5d77c0139a5e/LICENSE.md); homepage https://sonner.emilkowal.ski
- LaunchLoop: https://launchloop.dev/pricing, https://launchloop.dev/
- StartKitz: https://startkitz.com/ (pricing block; /pricing is client-rendered and returned 404 to WebFetch), https://startkitz.com/product-hunt-launch-kit
- ShipProof: https://shipproof.io/tools/launch-copy
- PH LaunchKit: https://phlaunchkit.com/tools/product-hunt-tagline-generator
- ChatGPT: https://chatgpt.com/pricing, https://chatgpt.com/
- Screenhance: https://screenhance.com/product-hunt-gallery-generator, https://screenhance.com/pricing
- Mydentify: https://mydentify.com/tools/launch-image-listing-asset-pack
- Perspecto: https://perspecto.io/product-hunt-mockup-generator, https://perspecto.io/pricing
- WhixFrame: https://www.whixframe.com/tools/product-hunt-gallery-generator, https://www.whixframe.com/pricing (plan cards client-rendered; FAQ only)
- Marketing Pack: https://getmarketingpack.com/, https://getmarketingpack.com/product-hunt-launch-kit
- Overnight Cut: https://overnightcut.com/tools/launch-copy-writer
- Simple App Shipper: https://simpleappshipper.com/launch-kit
- LaunchCopy: https://trylaunchcopy.com
- LaunchNudge: https://launchnudge.ai
- Repomix: https://repomix.com

## Every quote on the page

| # | Quote (verbatim) | Source |
| --- | --- | --- |
| 1 | "tagline caps at 60 characters" | https://help.producthunt.com/en/articles/17350772-launch-guide |
| 2 | "Tagline (max 60 characters)" | https://www.producthunt.com/launch/preparing-for-launch |
| 3 | "260 characters max" | https://help.producthunt.com/en/articles/17350772-launch-guide |
| 4 | "within 260 characters" | https://help.producthunt.com/en/articles/479557-how-to-post-a-product |
| 5 | "Description (max 500 characters)" | https://www.producthunt.com/launch/preparing-for-launch |
| 6 | "The recommended size for images in the gallery is 1270x760." | https://help.producthunt.com/en/articles/479557-how-to-post-a-product; https://www.producthunt.com/launch/preparing-for-launch |
| 7 | "The gallery will need 2+ images before it is viewable." | https://help.producthunt.com/en/articles/479557-how-to-post-a-product |
| 8 | "Gallery images (Two required)" | https://www.producthunt.com/launch/preparing-for-launch |
| 9 | "Product brief from your repo" | https://launchloop.dev/pricing |
| 10 | "Product Hunt tagline" | https://launchloop.dev/pricing |
| 11 | "First post of your X thread" | https://launchloop.dev/pricing |
| 12 | "3 watermarked images" | https://launchloop.dev/pricing |
| 13 | "Public repos only. 10 per hour, 40 per day." | https://launchloop.dev/pricing |
| 14 | "Paste a public GitHub repo or your live site. No account needed." | https://launchloop.dev/pricing |
| 15 | "Toast notifications for React with built-in animations" | first-party test output, `2026-10-27_launchloop_output.txt` |
| 16 | "StartKitz reads your product's landing page" | https://startkitz.com/product-hunt-launch-kit |
| 17 | "Free to generate. No account required. Results in under 30 seconds." | https://startkitz.com/ (pricing block) |
| 18 | "Product Hunt + Hacker News launch copy" | https://startkitz.com/ (pricing block) |
| 19 | "Product Hunt topics + first comment" | https://startkitz.com/ (pricing block) |
| 20 | "Starter $19 one-time" | https://startkitz.com/ (pricing block) |
| 21 | "Custom Toasts, Simplified" | first-party test output, `2026-10-27_startkitz_output.txt` |
| 22 | "Customize React toasts with ease" | first-party test output, `2026-10-27_startkitz_output.txt` |
| 23 | "Effortless notification customization for React developers seeking flexibility." | first-party test output, `2026-10-27_startkitz_output.txt` |
| 24 | "Free • No signup required • Powered by Claude AI" | https://shipproof.io/tools/launch-copy |
| 25 | "Yes. Describe your product and you get 8 tagline options tuned to the 60-character limit, free and without an account." | https://phlaunchkit.com/tools/product-hunt-tagline-generator |
| 26 | "Ship polished React toasts in minutes" | first-party test output, `2026-10-27_phlaunchkit_output.txt` |
| 27 | "React toast notifications without the setup pain" | first-party test output, `2026-10-27_phlaunchkit_output.txt` |
| 28 | "The free version of ChatGPT is available to everyone." | https://chatgpt.com/pricing |
| 29 | "Beautiful toast notifications for React, made simple." | first-party test output, `2026-10-27_chatgpt_output.txt` |
| 30 | "Meet Sonner, an opinionated toast component for React. Create beautiful, customizable notifications with a delightful developer experience and minimal setup. Just install, integrate, and toast!" | first-party test output, `2026-10-27_chatgpt_output.txt` |
| 31 | "Paste a public website URL to get source-backed launch copy, Product Hunt assets, an X post, screenshots, and a downloadable ZIP." | https://getmarketingpack.com/ |
| 32 | "One free pack every 30 days. Additional packs are $5 each." | https://getmarketingpack.com/ |
| 33 | "Tagline: up to 60 characters." | https://getmarketingpack.com/product-hunt-launch-kit |
| 34 | "Description: up to 260 characters." | https://getmarketingpack.com/product-hunt-launch-kit |
| 35 | "Maker comment: up to 2,000 characters." | https://getmarketingpack.com/product-hunt-launch-kit |
| 36 | "Opinionated toasts for React" | first-party test output, `2026-10-27_marketingpack_output.txt` (launch-copy.md in the pack) |
| 37 | "Sonner is an opinionated React toast component with configurable positions, types, actions, promises, loading states, custom content, themes, and styling options." | first-party test output, `2026-10-27_marketingpack_output.txt` (launch-copy.md in the pack) |
| 38 | "Draft: personalize this maker comment before posting." | first-party test output, `2026-10-27_marketingpack_output.txt` (launch-copy.md in the pack) |
| 39 | "Pre-sized to 1270×760. Pick a template, drop in your screenshots, and export your gallery." | https://screenhance.com/product-hunt-gallery-generator |
| 40 | "Yes. The free plan includes 3 exports per month with every template and device frame unlocked, plus screen recordings up to 5 minutes with a watermarked video preview. No credit card is required." | https://screenhance.com/pricing |
| 41 | "Free plan exports include a small "Made with Screenhance" mark in the bottom corner." | https://screenhance.com/pricing |
| 42 | "No account required" | https://mydentify.com/tools/launch-image-listing-asset-pack |
| 43 | "1200×630 social cover, 1600×900 launch cover, and 1270×760 Product Hunt gallery image" | https://mydentify.com/tools/launch-image-listing-asset-pack |
| 44 | "Input buffer contains unsupported image format" | first-party test output, `2026-10-27_mydentify_output.txt` (error text, both attempts) |
| 45 | "Free $0 No sign-up, no card." | https://perspecto.io/pricing |
| 46 | "3 PNG exports a day, at 1×" | https://perspecto.io/pricing |
| 47 | "Free with a small watermark; Pro ($19 once) removes it and exports at up to 4×." | https://perspecto.io/product-hunt-mockup-generator |
| 48 | "Yes. It runs in your browser with no account and no download limit. Exports include a small WhixFrame watermark." | https://www.whixframe.com/tools/product-hunt-gallery-generator |
| 49 | "An opinionated toast component for React." | Sonner `package.json` at commit 8e4662b39255120b62138312058f5d77c0139a5e (`description`) |
| 50 | "Answer a few questions and get a Product Hunt tagline, description and first comment, plus an X post and a LinkedIn post, with live character counts." | https://overnightcut.com/tools/launch-copy-writer (redirects to www.) |
| 51 | "Free tool · no signup" | https://overnightcut.com/tools/launch-copy-writer (redirects to www.) |
| 52 | "It uses templates, not AI, and it runs in your browser: nothing you type is sent to us." | https://overnightcut.com/tools/launch-copy-writer (redirects to www.) |
| 53 | "5 free kits per day per account" | https://simpleappshipper.com/launch-kit |
| 54 | "Paste a GitHub URL and let our AI turn your codebase into ready-to-publish social posts, blog articles, and case studies." | https://trylaunchcopy.com (WebFetch; curl got an empty client shell) |
| 55 | "Try it out with one scan" | https://trylaunchcopy.com (WebFetch; curl got an empty client shell) |
| 56 | "LaunchNudge's AI turns your repo into viral HN, Reddit, and X posts in 5 minutes." | https://launchnudge.ai (redirects to www.) |
| 57 | "Join the waiting list for early access and a shot at free lifetime upgrades." | https://launchnudge.ai (redirects to www.) |
| 58 | "Pack your codebase into AI-friendly formats" | https://repomix.com |
| 59 | "you can send it to an AI assistant (like ChatGPT, Claude)" | https://repomix.com |
