# Source check: Can ChatGPT write Product Hunt launch copy?, 10 November 2026

**URL:** `/blog/chatgpt-vs-product-hunt-launch-kits`
**Reading time:** 9 minutes (rendered body 1,666 words; e2e recounts)
**Original element:** First-party run on 10 November 2026, UTC (London that day), of `pmndrs/zustand` at commit `9fed2eb2f3af672da9f7bf694b996df3831fc207`. One run per tool, first output only, nothing submitted. Raw outputs, typed inputs and full-page screenshots are in `docs/seo/2026-11-10-chatgpt-vs-kits-run/`. Competitor screenshots are not used on the public page.

Character counts use `Array.from(text.trim()).length`, the same method as `docs/seo/2026-10-27-product-hunt-launch-tools.md`.

## Frozen inputs

From `docs/seo/2026-11-10-chatgpt-vs-kits-run/inputs.md`:

- Repo: https://github.com/pmndrs/zustand at commit 9fed2eb2f3af672da9f7bf694b996df3831fc207 (main).
- ChatGPT prompt (verbatim): `Write a Product Hunt launch for this open-source project: https://github.com/pmndrs/zustand . Give me a tagline, a description, and a maker's first comment.`
- Kit inputs: the repo URL, or if a kit only takes a website URL, https://zustand.docs.pmnd.rs. No other text, except the typed form fields below for tools that do not take a URL.

## Run log (10 November 2026, UTC = London)

| Tool | Time | Path | Input | Screenshot |
| --- | --- | --- | --- | --- |
| ChatGPT | 11:51:00 | ChatGPT, free and logged out | The verbatim prompt above | `chatgpt-full.png` and `chatgpt.txt` |
| LaunchLoop (ours) | 11:51:28 | Free preview | Repo URL | `launchloop-full.png` and `launchloop.txt`. Preview kit URL (not linked on the public page): https://launchloop.dev/kit/ODwFqyQSWD99ISlp13MQ4Q. The box browser already had a LaunchLoop session, so this was not a logged-out run. |
| StartKitz | 11:53:19 | https://startkitz.com/ homepage form. https://startkitz.com/product-hunt-launch-kit only links to that form. Result: https://startkitz.com/preview/118 | https://zustand.docs.pmnd.rs | `startkitz-full.png` and `startkitz.txt` |
| Overnight Cut | 11:54:35 | https://www.overnightcut.com/tools/launch-copy-writer (free template form; does not read URLs) | Product name=`Zustand`; sentence=`manages state in React apps with a small, fast, minimal API`; Who=`React developers`; Link=`github.com/pmndrs/zustand` | `overnightcut-full.png` and `overnightcut.txt` |
| ShipProof | 11:55:41 | https://shipproof.io/tools/launch-copy (reached via https://shipproof.io/tools, "AI Launch Copy Generator") | Product name=`Zustand`; pitch=`A small, fast, minimal state management library for React`; problem=`State management in React is often complex and boilerplate-heavy`; audience=React developers; default 3 platforms (Product Hunt, Twitter/X, Reddit) | `shipproof-full.png` and `shipproof.txt` |

## Counts (ours)

### Taglines

| Tool | Text | Characters | Fits 60? |
| --- | --- | --- | --- |
| ChatGPT recommended | State management in React, minus the boilerplate. 🐻 | 51 | Yes |
| ChatGPT alternative | Simple, fast, and scalable state management for React. | 54 | Yes |
| ChatGPT alternative | Less boilerplate. More building. Meet Zustand. | 46 | Yes |
| ChatGPT alternative | Your React app's state, under control. | 38 | Yes |
| ChatGPT alternative | The bear necessities of state management. | 41 | Yes |
| LaunchLoop | Hook-based React state without providers or boilerplate | 55 | Yes (the preview also showed 55/60) |
| StartKitz short | Simplify State | 14 | Yes (tool showed 14) |
| StartKitz medium | Streamline React with Zustand | 29 | Yes (tool showed 29) |
| StartKitz long | Zustand: Simplifying React state management with a minimal API. | 63 | No (tool showed 63) |
| Overnight Cut 1 | Zustand manages state in React apps with a small, fast, minimal API | 67 | No (tool showed 67 of 60) |
| Overnight Cut 2 | Manages state in React apps with a small, fast, minimal API | 59 | Yes (tool showed 59 of 60) |
| Overnight Cut 3 | Manages state in React apps with a small, fast, minimal API for React developers | 80 | No (tool showed 80 of 60) |
| ShipProof | Turn every launch into lasting social proof | 43 | Yes, as a string. The text is about ShipProof, not Zustand. |

ChatGPT also offered a later "launch recommendations" tagline without the bear emoji ("State management in React, minus the boilerplate.", 49). The page uses the first "Recommended" tagline under "1. Tagline", plus the four alternatives listed there, as the first output.

### Descriptions and maker comments

Counted on the full first-output field, including line breaks, emoji and links, after trim.

| Tool | Field | Characters | Notes |
| --- | --- | --- | --- |
| ChatGPT | Description (the "2. Product description" / "Writing" block, from "Meet Zustand" through the GitHub URL) | 1181 | Over 260 and over 500. This block contains an em dash and typographic punctuation, so it is not pasted in full on the public page. |
| ChatGPT | Maker comment (the "3. Maker's first comment" / "Writing" block, from "Hey Product Hunt!" through "Happy building!") | 1003 | Count only. No Product Hunt maker comment limit is quoted on the pages we re-use. |
| Overnight Cut | Description | 96 | Fits 260 and 500. Tool showed "96 of 500". Our count matches. |
| Overnight Cut | First comment | 222 | Tool showed 224. We use 222 from `Array.from(text.trim()).length` on the logged sentence, and that is the number on the public page. |
| ShipProof | Description (the Product Hunt DESCRIPTION block) | 588 | Over 260 and over 500. About ShipProof, not Zustand. Contains em dashes, so not pasted in full on the public page. |
| ShipProof | Maker comment (the Product Hunt MAKER COMMENT block, not the separate FIRST COMMENT) | 370 | Count only. About ShipProof. |
| LaunchLoop | Product Hunt description / maker comment | not returned | Free preview only: tagline, product brief, one sample X post. Paid kit (£19) not bought. Brief opening line: "Lightweight, hook-based state management for React without context providers or boilerplate" (91 characters). |
| StartKitz | Product Hunt description / maker comment | not returned | Free preview returned taglines and launch posts. Paywall listed Starter at $19. The button copy on the page included an em dash ("Get Starter — $19"), which is not quoted on the public page. |

## Every quote on the page

| Quote | Source | Read |
| --- | --- | --- |
| "Tagline (up to 60 characters)" | https://www.producthunt.com/launch/preparing-for-launch | Re-used from 2026-11-09 (`docs/seo/2026-11-09-product-hunt-vs-show-hn.md`); not a new fetch |
| "Description (max 500 characters)" | https://www.producthunt.com/launch/preparing-for-launch | Re-used from 2026-10-27 (`docs/seo/2026-10-27-product-hunt-launch-tools.md`); not a new fetch |
| "260 characters max" | https://help.producthunt.com/en/articles/17350772-launch-guide | Re-used from 2026-10-27 launch-tools source check; not a new fetch |
| "within 260 characters" | https://help.producthunt.com/en/articles/479557-how-to-post-a-product | Re-used from 2026-10-27 launch-tools source check; not a new fetch |
| "State management in React, minus the boilerplate. 🐻" | first-party ChatGPT output, `docs/seo/2026-11-10-chatgpt-vs-kits-run/chatgpt.txt` | 2026-11-10 11:51:00 |
| "Simple, fast, and scalable state management for React." | same | 2026-11-10 11:51:00 |
| "Less boilerplate. More building. Meet Zustand." | same | 2026-11-10 11:51:00 |
| "Your React app's state, under control." | same | 2026-11-10 11:51:00 |
| "The bear necessities of state management." | same | 2026-11-10 11:51:00 |
| "Zustand makes state management refreshingly simple." | same | 2026-11-10 11:51:00 |
| "Hook-based React state without providers or boilerplate" | first-party LaunchLoop free preview, `docs/seo/2026-11-10-chatgpt-vs-kits-run/launchloop.txt` | 2026-11-10 11:51:28 |
| "Simplify State" | first-party StartKitz output, `docs/seo/2026-11-10-chatgpt-vs-kits-run/startkitz.txt` | 2026-11-10 11:53:19 |
| "Streamline React with Zustand" | same | 2026-11-10 11:53:19 |
| "Zustand: Simplifying React state management with a minimal API." | same | 2026-11-10 11:53:19 |
| "Zustand manages state in React apps with a small, fast, minimal API" | first-party Overnight Cut output, `docs/seo/2026-11-10-chatgpt-vs-kits-run/overnightcut.txt` | 2026-11-10 11:54:35 |
| "Manages state in React apps with a small, fast, minimal API" | same | 2026-11-10 11:54:35 |
| "Manages state in React apps with a small, fast, minimal API for React developers" | same | 2026-11-10 11:54:35 |
| "Zustand manages state in React apps with a small, fast, minimal API. Built for React developers." | same | 2026-11-10 11:54:35 |
| "Hi everyone, thanks for checking out Zustand. Zustand manages state in React apps with a small, fast, minimal API. It is for React developers. I would love your honest feedback. What would make Zustand more useful for you?" | same | 2026-11-10 11:54:35 |
| "Turn every launch into lasting social proof" | first-party ShipProof output, `docs/seo/2026-11-10-chatgpt-vs-kits-run/shipproof.txt` | 2026-11-10 11:55:41 |

## Facts on the page that are not quotes

- LaunchLoop free preview contents and £19 kit price: product copy on launchloop.dev, consistent with `/pricing` and earlier posts. Paid kit not bought, so description and maker comment were not compared.
- StartKitz Starter at $19: from the paywall on the 10 November 2026 run (`startkitz.txt`: "Get Starter — $19"). The em dash is not quoted on the page.
- Overnight Cut is a free template form that does not read URLs: observed on the run path.
- ShipProof ignored the typed Zustand inputs and wrote about ShipProof: observed in `shipproof.txt` (no mention of Zustand in the output).
- Product Hunt maker comment: no limit quoted on the re-used PH pages, same stance as the 27 October 2026 launch-tools post.

## Not used on the public page

- StartKitz launch score 61/100 and the sentence "Great tool, but messaging is a muddled mess." (about Zustand's messaging, in the StartKitz preview). Left out so the page stays a field-by-field comparison, not a scorecard.
- StartKitz one-liners other than the three labelled taglines, and its X, LinkedIn and Reddit posts.
- LaunchLoop product brief body and X post (mentioned, not tabled, because they are not Product Hunt listing fields).
- ShipProof Twitter and Reddit outputs, and its separate "FIRST COMMENT" block (the page counts the "MAKER COMMENT" block).
- ChatGPT's extra "launch recommendations" after the three listing fields.
- Any competitor-page screenshot.
