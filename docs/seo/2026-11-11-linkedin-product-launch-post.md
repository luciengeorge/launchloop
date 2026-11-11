# LinkedIn product launch post: source and example log

Checked: 11 November 2026, Europe/London (UTC). No paid research, generation, purchase or LinkedIn submission.

**Original element:** Three original editorial launch drafts for frozen public README inputs, with reproducible character counts, source-to-claim notes and a copyable template. These are not published posts or measured engagement results.

## Scope and honest labelling

The October direction plan proposed LaunchLoop-generated drafts for three repos. The LinkedIn post is part of the paid full kit, as confirmed on the pricing page this run. No kit was purchased and no full-kit generation was run. These examples are editorial drafts written for this guide, not LaunchLoop kit outputs. The page and FAQ disclose that distinction. This substitution needs editorial review, rather than presenting an unperformed product test as completed.

The page makes no promise about link placement, feed ranking, the best time to post or a fixed see-more character cutoff. None is needed to teach a post structure. Editorial suggestions are labelled as suggestions, not LinkedIn rules. No percentages, customer metrics, maintainer testimonials or claims of launch success appear.

## LinkedIn sources fetched this run

All four pages were opened with WebFetch on 11 November 2026. WebSearch was discovery only. Facts below are from the fetched page bodies.

| Source | Exact excerpt or supported fact | Use on page |
|---|---|---|
| https://www.linkedin.com/help/linkedin/answer/a528176 | "Posts can contain up to 3,000 characters." | Dated ceiling in body and FAQ. Not a target length. |
| https://www.linkedin.com/help/linkedin/answer/a525301 | "Allow a few seconds for a preview image to display" and "If we’re not able to retrieve a preview image, you can still share your update as a link." | Dated URL-sharing instructions, not a reach claim. |
| https://www.linkedin.com/help/linkedin/answer/a521928/making-your-website-shareable-on-linkedin?lang=en | "Max file size: 5 MB", "Minimum image dimensions: 1200 (w) x 627 (h) pixels", "Recommended ratio: 1.91:1"; site source must comply with Open Graph Protocol | Dated shared-link requirements. The separate ad specifications are not used. Canonical short help URL is linked on the page. |
| https://www.linkedin.com/help/linkedin/answer/a6233775 | "You can use the Post Inspector as a tool to refresh the URL." "The preview for any existing posts with this URL will remain the same." | Dated explanation that refresh affects new posts only. |

## Product sources fetched this run

https://launchloop.dev/pricing was opened with WebFetch on 11 November 2026. The Launch Kit list includes "LinkedIn post". The page links pricing, makes no new full-kit output claim and does not repeat a price or a platform-limit pass claim about LaunchLoop.

https://launchloop.dev/ was also opened as context, not as proof of LinkedIn's rules. Platform claims rely on LinkedIn Help above.

## Frozen example inputs

The public main commit SHA was resolved from GitHub's public commits endpoint before writing each example. Each README was then fetched at that full SHA on 11 November 2026. Full source snapshots remain in the box research directory, not in the repository. No private repo was sent to another service.

| Example | Frozen README | Facts used |
|---|---|---|
| Sonner | https://github.com/emilkowalski/sonner/blob/8e4662b39255120b62138312058f5d77c0139a5e/README.md | "is an opinionated toast component for React"; add Toaster, then call toast(); README button example. |
| Zustand | https://github.com/pmndrs/zustand/blob/9fed2eb2f3af672da9f7bf694b996df3831fc207/README.md | "Your store is a hook!"; "Use the hook anywhere, no providers are needed."; counter and action example; components re-render when selected state changes. |
| Nano ID | https://github.com/ai/nanoid/blob/055d1700cc67ac843e3efb5235d806b419ec7b2b/README.md | URL-friendly string ID generator for JavaScript; import and call nanoid(); custom alphabet and size sections include safety trade-offs. No benchmark numbers or security comparisons reused. |

## Reproducible counts

Texts are stored once in `src/lib/linkedin-launch-examples.ts`, rendered verbatim in wrapping preformatted blocks and passed unchanged to the existing CopyButton. Counts use `Array.from(text.trim()).length`, including line breaks and the literal URL. All three examples contain ASCII only, so UTF-16 code units and code-point counts agree for this data. This is not a test of LinkedIn's composer or of general Unicode counting.

| Example | Characters | Against the sourced 3,000-character ceiling |
|---|---|---|
| Sonner | 398 | Below |
| Zustand | 376 | Below |
| Nano ID | 394 | Below |

No post was submitted. No maintainer is quoted as having written these drafts. No traffic, reach or conversion results were observed or claimed.

**Reading time:** 9 minutes (1,750 words in the rendered article body at the initial preflight, divided by 200 and rounded up). The e2e suite recounts this using its existing blog assertion.

## Integration

The new BLOG_POSTS registry entry feeds the blog index, RSS, sitemap, llms.txt, llms-full.txt and OG route via the existing page registry. The route uses blogPageMetadata, BlogPostLayout for BlogPosting and breadcrumbs, and Faq for visible answers plus matching FAQPage JSON-LD. The OG guide has an inbound contextual link; the new post links the OG checker, OG guide and the preceding ChatGPT-versus-kits post.

Tests cover metadata, feed/index/sitemap registration, OG rendering, JSON-LD, FAQ, contextual links, example counts, copy behaviour, table semantics and mobile overflow. No new tool, dependency, environment variable or shared component was introduced.
