# Source check: OG image size, 26 October 2026

Blog post requested on Wednesday 21 October 2026, to publish on Monday 26 October 2026. Sources were read on 21 October 2026 between about 07:15 and 07:40 UTC. Every quote on the page was copied from the fetched page, not from memory or a search snippet, and then checked again by script (see Method).

## Page

**URL:** `/blog/og-image-size`
**Title:** `OG image size: X, LinkedIn, Facebook and Slack · LaunchLoop` (59 characters). Facebook's doc was readable, so the title keeps Facebook (the fallback title without it wasn't needed).
**Description:** `Open Graph image size from each platform's own docs: a safe 1200×630 default, what Facebook, LinkedIn, X and Slack say, the tags to set and how to test it.` (155 characters)
**H1:** OG image size for X, LinkedIn, Facebook and Slack. **Published and updated:** 2026-10-26 (the date in the brief; bump both in `src/lib/blog.ts` if it merges on another day). **Byline:** Lucien George. **Reading time:** 15 min (2,948 words / 200, after the Discord line in "Where the docs disagree" was corrected on 26 October; 2,930 before).

Targets "og image size", "open graph image size" and "open graph image", plus "twitter card image size" (the X section and FAQ) and "linkedin preview image size" (the LinkedIn section and the 1200×627 FAQ). No keyword volumes were looked up for this post, so none are quoted.

### Scope, and the split with the OG preview tool

`/tools/og-preview` keeps "og image preview" and "og image checker": the tool, the tags, the pitfalls and its own FAQ. The post owns the size question. In the same PR the tool page:

- No longer says 1200×630 is "the size Facebook, LinkedIn, X and Slack all design their large card around". It now says it's the size Facebook recommends and meets LinkedIn's 1200×627 minimum, while X's archived docs describe 2:1 and Slack publishes no size.
- Answers "What size should an Open Graph image be?" in one sentence plus a link to `/blog/og-image-size`, in the visible FAQ and in the FAQPage JSON-LD (as an `<a>`, which Google allows in Answer text).

The post's five FAQs don't repeat the tool's five (size, missing preview, why cards differ, does it make an image, is it free).

## Method

- `curl` with a Chrome user agent read LinkedIn Help, ogp.me, Slack's docs, the Slack Robots page and Discord's docs directly (HTTP 200). Discord's Link Previews doc was also read as Markdown from `docs.discord.com/developers/link-previews/overview.md`; the quotes match the HTML page.
- **Facebook:** `https://developers.facebook.com/docs/sharing/webmasters/images` returned HTTP 400 to a plain `curl`. With a browser-like request (Chrome user agent, `Accept`, `Accept-Language`, `Sec-Fetch-*` headers) it returns HTTP 301 to `https://developers.facebook.com/documentation/sharing/webmasters/images`, which returned the full page (HTTP 200, "Updated: Jun 30, 2026"). The same worked for the webmasters guide. The post links the `/documentation/` URLs. Every Facebook quote was checked in the raw HTML. The Wayback Machine was briefly offline during the first attempt and was used later for the cross-check below.
- **X:** the live card docs are gone. `developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image` now redirects to `https://docs.x.com/overview`, and the same paths on `docs.x.com` return HTTP 404 (checked 21 October 2026). The X quotes come from the Internet Archive's raw (`id_`) captures: Summary Card with Large Image, 12 January 2026 (`20260112050218`); Cards markup, 16 January 2026 (`20260116124848`); Troubleshooting Cards, 4 January 2026 (`20260104011518`, served gzipped). The post labels them as X's archived docs with those dates.
- **LinkedIn Post Inspector** (`https://www.linkedin.com/post-inspector/`) is a JavaScript app whose HTML has no readable text, so the post describes it from LinkedIn's help article "Use Post Inspector to refresh URL" (a6233775), found by web search and then fetched directly.
- **LaunchLoop's OG preview** was described from the live page at `https://launchloop.dev/tools/og-preview` (read 21 October 2026): the intro, the noscript note, the WebApplication feature list and the "Is the OG preview free?" FAQ answer.
- Each page was saved and reduced to plain text, and a script searched for every `<q>` on the post in it: 52 of 52 match word for word, keeping each page's own apostrophes (Facebook uses curly ones).
- Cross-check: every non-X quote was also searched for in the Internet Archive's latest capture of its page (June to October 2026, dates in the table). All 44 match. The two differences are formatting only: Facebook's archived Markdown copies use straight apostrophes where the live pages have curly ones (rows 9, 41 and 42), and "Facebook Crawler" is a link in the archived webmasters guide (row 10). The 8 X quotes are from the archive captures themselves.

## Sources

Facebook (Meta for Developers):

- Images in Link Shares, "Updated: Jun 30, 2026": https://developers.facebook.com/documentation/sharing/webmasters/images (redirect target of https://developers.facebook.com/docs/sharing/webmasters/images)
- A Guide to Sharing for Webmasters, "Updated: Jun 30, 2026": https://developers.facebook.com/documentation/sharing/webmasters
- Sharing Debugger (linked, not quoted; the tool needs a login): https://developers.facebook.com/tools/debug/

LinkedIn Help (each shows a relative "Last updated" date, not a calendar date):

- Make your website shareable on LinkedIn (a521928), "Last updated: 2 years ago": https://www.linkedin.com/help/linkedin/answer/a521928
- Share articles or links (a525301), "Last updated: 2 years ago": https://www.linkedin.com/help/linkedin/answer/a525301
- Troubleshooting issues sharing URLs (a525063), "Last updated: 3 years ago": https://www.linkedin.com/help/linkedin/answer/a525063
- Use Post Inspector to refresh URL (a6233775), "Last updated: 3 years ago": https://www.linkedin.com/help/linkedin/answer/a6233775
- Post Inspector (linked, not quoted): https://www.linkedin.com/post-inspector/

X developer docs, archived by the Internet Archive:

- Summary Card with Large Image, 12 January 2026: https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image
- Cards markup, 16 January 2026: https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup
- Troubleshooting Cards, 4 January 2026: https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards

Slack (undated pages):

- Unfurling links in messages: https://docs.slack.dev/messaging/unfurling-links-in-messages (also served at the old `api.slack.com/reference/messaging/link-unfurling`)
- Slack Robots: https://api.slack.com/robots

Discord (undated):

- Link Previews: https://docs.discord.com/developers/link-previews/overview
- Embed Debugger (linked, not quoted): https://discord.com/developers/embeds

Open Graph protocol (undated): https://ogp.me/

## Every quote on the page

All read on 21 October 2026 (the X rows from the archive captures named above).

| # | Quote (verbatim) | Source | Also in an Internet Archive copy |
| --- | --- | --- | --- |
| 1 | "Use images that are at least 1200 x 630 pixels for the best display on high resolution devices." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
| 2 | "Minimum image dimensions: 1200 (w) x 627 (h) pixels" | https://www.linkedin.com/help/linkedin/answer/a521928 | yes (2026-08-17) |
| 3 | "Recommended ratio: 1.91:1" | https://www.linkedin.com/help/linkedin/answer/a521928 | yes (2026-08-17) |
| 4 | "Try to keep your images as close to 1.91:1 aspect ratio as possible to display the full image in Feed without any cropping." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
| 5 | "The minimum allowed image dimension is 200 x 200 pixels." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
| 6 | "At the minimum, you should use images that are 600 x 315 pixels to display link page posts with larger images." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
| 7 | "If your image is smaller than 600 x 315 px, it will still display in the link page post, but the size will be much smaller." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
| 8 | "The size of the image file must not exceed 8 MB." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
| 9 | "Most content is shared to Facebook as a URL, so it’s important that you mark up your website with Open Graph tags to take control over how your content appears on Facebook." | https://developers.facebook.com/documentation/sharing/webmasters | yes (2026-10-15), with a straight apostrophe |
| 10 | "the Facebook Crawler uses internal heuristics to make a best guess about the title, description, and preview image for your content." | https://developers.facebook.com/documentation/sharing/webmasters | yes (2026-10-15), "Facebook Crawler" is a link there |
| 11 | "image requirements specific to the LinkedIn sharing module" | https://www.linkedin.com/help/linkedin/answer/a521928 | yes (2026-08-17) |
| 12 | "Max file size: 5 MB" | https://www.linkedin.com/help/linkedin/answer/a521928 | yes (2026-08-17) |
| 13 | "image frame is a 1.91:1 ratio and 1200 (w) x 627 (h) pixels" | https://www.linkedin.com/help/linkedin/answer/a525301 | yes (2026-07-04) |
| 14 | "The LinkedIn share box relies on websites to use oEmbeds and/or Open Graph Protocol (OGP) to display the most accurate title, description, and image when sharing a URL." | https://www.linkedin.com/help/linkedin/answer/a525063 | yes (2026-07-04) |
| 15 | "Images for this Card support an aspect ratio of 2:1 with minimum dimensions of 300x157 or maximum of 4096x4096 pixels." | https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image | is the archive copy |
| 16 | "Images must be less than 5MB in size. JPG, PNG, WEBP and GIF formats are supported. Only the first frame of an animated GIF will be used. SVG is not supported." | https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image | is the archive copy |
| 17 | "Must be set to a value of “summary_large_image”" | https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image | is the archive copy |
| 18 | "If an og:type, og:title and og:description exist in the markup but twitter:card is absent, then a summary card may be rendered." | https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup | is the archive copy |
| 19 | "Slack crawls the URL, looks for common OpenGraph and X (formerly known as Twitter) Card metadata, and renders some micro-approximation of the content." | https://docs.slack.dev/messaging/unfurling-links-in-messages | yes (2026-10-16) |
| 20 | "It fetches as little of the page as it can (using HTTP Range headers) to extract meta tags about the content." | https://api.slack.com/robots | yes (2026-10-05) |
| 21 | "If a page's tags refer to an image, video, or audio file, we will fetch that file as well to check validity and extract other metadata." | https://api.slack.com/robots | yes (2026-10-05) |
| 22 | "Supported formats are .png, .gif, .jpg, .jpeg, .webp, and .avif." | https://docs.discord.com/developers/link-previews/overview | yes (2026-10-20) |
| 23 | "Link previews are subject to change." | https://docs.discord.com/developers/link-previews/overview | yes (2026-10-20) |
| 24 | "An image URL which should represent your object within the graph." | https://ogp.me/ | yes (2026-10-11) |
| 25 | "The number of pixels wide." | https://ogp.me/ | yes (2026-10-11) |
| 26 | "The number of pixels high." | https://ogp.me/ | yes (2026-10-11) |
| 27 | "If the page specifies an og:image it should specify og:image:alt." | https://ogp.me/ | yes (2026-10-11) |
| 28 | "The four required properties for every page" | https://ogp.me/ | yes (2026-10-11) |
| 29 | "will specify the image dimensions to the crawler so that it can render the image immediately without having to asynchronously download and process it." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
| 30 | "Provide og:image:width and og:image:height. Without them, Discord fetches the image to measure it." | https://docs.discord.com/developers/link-previews/overview | yes (2026-10-20) |
| 31 | "A description of what is in the image (not a caption)." | https://ogp.me/ | yes (2026-10-11) |
| 32 | "A one to two sentence description of your object." | https://ogp.me/ | yes (2026-10-11) |
| 33 | "A brief description of the content, usually between 2 and 4 sentences." | https://developers.facebook.com/documentation/sharing/webmasters | yes (2026-10-15) |
| 34 | "You can use the Post Inspector as a tool to refresh the URL." | https://www.linkedin.com/help/linkedin/answer/a6233775 | yes (2026-06-17) |
| 35 | "Confirm that the preview window shows the correct content." | https://www.linkedin.com/help/linkedin/answer/a6233775 | yes (2026-06-17) |
| 36 | "The preview for any existing posts with this URL will remain the same." | https://www.linkedin.com/help/linkedin/answer/a6233775 | yes (2026-06-17) |
| 37 | "will show which meta tags the crawler scrapes as well as any errors or warnings." | https://developers.facebook.com/documentation/sharing/webmasters | yes (2026-10-15) |
| 38 | "which shows how Discord reads a URL, including which tags it picked up and which layout it chose." | https://docs.discord.com/developers/link-previews/overview | yes (2026-10-20) |
| 39 | "Relative URLs must start with /." | https://docs.discord.com/developers/link-previews/overview | yes (2026-10-20) |
| 40 | "The crawler has to see an image at least once before it can be rendered." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
| 41 | "This means that the first person who shares a piece of content won’t see a rendered image" | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10), with a straight apostrophe |
| 42 | "Use a new URL for the new image or the image won’t be updated" | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10), with a straight apostrophe |
| 43 | "Please allow 48 hours from the last time you've shared this URL before you try again." | https://www.linkedin.com/help/linkedin/answer/a525063 | yes (2026-07-04) |
| 44 | "The Twitter web crawler re-indexes the Card tag information on your page roughly every seven days." | https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards | is the archive copy |
| 45 | "Images referenced in a Card are also cached based on URL." | https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards | is the archive copy |
| 46 | "Responses to these requests are cached globally across the service for around 30 minutes." | https://api.slack.com/robots | yes (2026-10-05) |
| 47 | "Discord caches previews for about 30 minutes." | https://docs.discord.com/developers/link-previews/overview | yes (2026-10-20) |
| 48 | "The tags must be in the HTML your server sends. No code is executed, so tags added by a client-side script after load are never seen." | https://docs.discord.com/developers/link-previews/overview | yes (2026-10-20) |
| 49 | "The most common cause is that the image specified via the twitter:image tag is not publicly accessible on the web." | https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards | is the archive copy |
| 50 | "Your website has a robots.txt file that is blocking Twitter from getting your Card metadata." | https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards | is the archive copy |
| 51 | "We do not currently honor robots.txt files." | https://api.slack.com/robots | yes (2026-10-05) |
| 52 | "Our crawler only accepts gzip and deflate encodings, so make sure your server uses the right encoding." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
## Paraphrased claims and their sources

- 1200×630 meets LinkedIn's 1200 x 627 minimum in both directions, and 1200 / 630 is about 1.905: arithmetic on quotes 1 and 2. The words "at least" in the quick answer's quote are Facebook's ("Use images that are at least 1200 x 630 pixels", quote 1), not LinkedIn's: LinkedIn's wording is "Minimum image dimensions" (quote 2).
- 1200×630 sits inside X's archived 300x157 minimum and 4096x4096 maximum: arithmetic on quote 15.
- A 2:1 image at 1200 wide is 1200×600, below LinkedIn's 627-pixel minimum height: arithmetic on quotes 2 and 15.
- LinkedIn's single image ads specifications are separate from the sharing module: a521928 lists them under "The image specifications for single image ads are:".
- X's archived markup reference lists `og:image` as the fallback for `twitter:image`, and `og:title` / `og:description` for the title and description: the "OpenGraph" column of the tag table.
- Facebook's `og:image:type` lists only JPEG, GIF and PNG: "MIME type of the image. One of image/jpeg, image/gif or image/png" (webmasters guide, Images table).
- Discord's only 1200 and 630 are in the Quick Start example (`og:image:width` 1200, `og:image:height` 630) and the oEmbed example (`thumbnail_width` 1200, `thumbnail_height` 630). The doc has no recommended size.
- Discord's Video section has an example with 1280 and 720 (`og:video:width` 1280, `og:video:height` 720, and `og:image:width` 1280, `og:image:height` 720 for its still image), read on 26 October 2026. So the post's "Where the docs disagree" list says Discord only uses sizes in its examples, 1200×630 and 1280×720, instead of the earlier "Discord only shows one in an example".
- Discord caps the whole fetch at 50 MB ("At most 50 MB of data returned.") and suggests a new query string such as `?v=2` to see changes immediately.
- The Open Graph protocol lists width, height and alt as optional structured properties of `og:image` ("The og:image property has some optional structured properties").
- Setting width and height is one of three fixes Facebook lists for the first-share problem (Images in Link Shares, "Pre-caching images").
- Slack's unfurling doc mentions no preview tool, and Slack publishes no image dimensions, ratio or file limit: no "pixel" or size figure appears in the unfurling doc or on the Robots page.
- X's archived docs mention a "Twitter Card Validator"; the post doesn't send readers to it because the card docs are gone and its current state wasn't checked.
- The OG preview tool's description (fetches like a link previewer, shows the common large card at 1200×630, checks title, description, url, the image's real size, format and file size, width/height/alt and `twitter:card`, free, no sign-up, doesn't save the URL): the live tool page, 21 October 2026.
- The kit's images (1200×630 OG, 1600×900 post image, 1270×760 Product Hunt gallery): `src/lib/image-variants.ts` and the "3 on-brand images" feature in `src/lib/site.ts`. 1600×900 for launch posts is LaunchLoop's house style (from the brief), and the post says no platform doc sets it.

## Where the docs disagree

- **Ratio:** Facebook "as close to 1.91:1 aspect ratio as possible", LinkedIn "Recommended ratio: 1.91:1", X (archived) "an aspect ratio of 2:1".
- **Minimum size:** Facebook 200 x 200 allowed and 600 x 315 for the large card, X (archived) 300x157, LinkedIn 1200 x 627.
- **File size:** LinkedIn 5 MB, X (archived) less than 5MB, Facebook 8 MB.
- **Description length:** ogp.me "A one to two sentence description", Facebook "usually between 2 and 4 sentences".
- **robots.txt:** X's archived troubleshooting page lists a blocking robots.txt as a cause; Slack's Robots page says "We do not currently honor robots.txt files."
- **No size published:** Slack, Discord (examples only) and ogp.me.

## Left out

- **Facebook:** nothing had to be cut. The doc was readable via a browser-like fetch, so Facebook stays in the title and its sizes are quoted.
- **LinkedIn single image ads specs** (JPG, PNG or GIF, 7680 x 4320 maximum, 640 x 360 minimum and the square and vertical sizes): they're for paid ads, not shared links.
- **Everything in a521928 after the single image ads specifications.** That part of the article has three lines: "Images less than 401 pixels wide display as a thumbnail image.", a tip about ads shared organically, and the note "If the image meets the requirements, but it still does not appear in updates on LinkedIn, your website may be blocking us from pulling the image or the image may be located on a protected directory or website." It isn't clear whether they belong to the sharing module or to the ads specifications, so one rule applies to all three: none is used. An earlier revision quoted the "blocking us" note in the post and on the tool page while leaving out the 401px line; after Site QA (21 October 2026) the note was removed from both, and X's archived troubleshooting quote about images that aren't publicly accessible covers the same check.
- **LinkedIn's three-day share box note** in "Edit a shared post" (a522811): only seen in a search result, not fetched, so not used.
- **X's other limits** (`twitter:image:alt` maximum 420 characters, title 70 and description 200 characters, the 2 MB page limit, the 144 x 144 minimum on the troubleshooting page, TLS and IP ranges): not needed for the size question, and the 144 x 144 figure conflicts with the 300x157 on the card page.
- **Discord's other limits** (title 70 bytes, description 350 bytes, 4 images per link, 5 links per message): not about the image size.
- **Product Hunt image sizes:** left to `/product-hunt-launch-checklist#images`, which the post links.
- **Any stats on how often each mistake happens:** none of the sources give one, and the post says the list is checks, not a ranking.
- **Any LaunchLoop metric or testimonial:** none used.

## Follow-ups

- Done in this PR after review: the interactive tool's caption in `src/components/tools/og-preview.tsx` used to say the preview frame is "The large card X, LinkedIn, Slack, Facebook and iMessage are based on". It now calls it a generic large-card preview, says each platform crops and renders link cards a little differently, and links to `/blog/og-image-size`. No Apple source was read, so it says nothing about iMessage.
- Done in this PR after review: the tool page's SVG and robots.txt pitfalls were unsourced, and after Site QA so were four more pitfalls and some checker notes. See "Quotes on /tools/og-preview" below.

## Quotes on /tools/og-preview

Added after review on 21 October 2026, and extended after two Site QA rounds the same day. The aim: every pitfall on the tool page, the intro, the size list, and every note in `src/lib/og-check.ts` (plus the verdict line in `src/components/tools/og-preview.tsx`) either cites a source in this log, quoted or paraphrased, or is neutral advice that makes no claim about how a platform behaves. As of the third round that holds for every note in `og-check.ts`; the neutral ones are listed under "Checker notes" below. Each quote was checked by script against the same saved copies as the post's quotes. The LinkedIn, Facebook and Slack lines were read live again on 21 October 2026 at about 08:09 UTC and still match (Slack wraps `robots.txt` in `<code>`).

| # | Quote (verbatim) | Where on the tool | Source | Read |
| --- | --- | --- | --- | --- |
| T1 | "SVG is not supported." | SVG pitfall | https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image | 21 October 2026 (archive capture of 12 January 2026) |
| T2 | "will still display in the link page post, but the size will be much smaller." | SVG pitfall, and the checker's note for images under 600×315 | https://developers.facebook.com/documentation/sharing/webmasters/images | 21 October 2026 |
| T3 | "The most common cause is that the image specified via the twitter:image tag is not publicly accessible on the web." | Login wall pitfall | https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards | 21 October 2026 (archive capture of 4 January 2026) |
| T4 | "Your website has a robots.txt file that is blocking Twitter from getting your Card metadata." | Login wall pitfall | https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards | 21 October 2026 (archive capture of 4 January 2026) |
| T5 | "We do not currently honor robots.txt files." | Login wall pitfall | https://api.slack.com/robots | 21 October 2026 |
| T6 | "No code is executed, so tags added by a client-side script after load are never seen." | JavaScript pitfall | https://docs.discord.com/developers/link-previews/overview | 21 October 2026 |
| T8 | "as close to 1.91:1 aspect ratio as possible to display the full image in Feed without any cropping." | Edges pitfall | https://developers.facebook.com/documentation/sharing/webmasters/images | 21 October 2026 |
| T9 | "roughly every seven days" | Cached card pitfall | https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards | 21 October 2026 (archive capture of 4 January 2026) |
| T10 | "for around 30 minutes" | Cached card pitfall | https://api.slack.com/robots | 21 October 2026 |
| T11 | "can also be used to update the image for a piece of content" | Cached card pitfall | https://developers.facebook.com/documentation/sharing/webmasters/images | 21 October 2026 |
| T12 | "You can use the Post Inspector as a tool to refresh the URL." | Cached card pitfall | https://www.linkedin.com/help/linkedin/answer/a6233775 | 21 October 2026 |
| T13 | "Use the og:image property to include an image in your link preview." | Intro, iMessage source line | https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages | 21 October 2026 |
| T14 | "Use the og:title property to specify the title of your link preview." | Intro, iMessage source line | https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages | 21 October 2026 |
| T16 | "Link previews do not follow meta redirects, nor run JavaScript; metadata must be available directly on the linked page." | JavaScript pitfall (second source) | https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages | 21 October 2026 |
| T17 | "Avoid text in preview images." | Size list, "One idea, big type" (iMessage caveat) | https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages | 21 October 2026 |
| T18 | "maximum 200 characters" | Checker note for an og:description over 200 characters | https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup | 21 October 2026 (archive capture of 16 January 2026) |
| T19 | "A one to two sentence description of your object." | Checker note for no description at all | https://ogp.me/ | 21 October 2026 |
| T20 | "generally recommended" | Checker note for a meta description without og:description | https://ogp.me/ | 21 October 2026 |
| T21 | "for the best display on high resolution devices" | Checker note for a right-shaped image under 1200 wide | https://developers.facebook.com/documentation/sharing/webmasters/images | 21 October 2026 |
| T22 | "users who are visually impaired" | Checker note for a missing og:image:alt | https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image | 21 October 2026 (archive capture of 12 January 2026) |
| T23 | "a large, full-width prominent image" | Checker note when twitter:card is summary_large_image | https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image | 21 October 2026 (archive capture of 12 January 2026) |
| T24 | "a summary card may be rendered" | Checker note for a missing twitter:card | https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup | 21 October 2026 (archive capture of 16 January 2026) |
| T25 | "Must be set to a value of “summary_large_image”" | Checker note for any other twitter:card value | https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image | 21 October 2026 (archive capture of 12 January 2026) |
| T26 | "Likes and Shares for this URL will aggregate at this URL." | Checker note when og:url is set | https://developers.facebook.com/documentation/sharing/webmasters | 21 October 2026 |
| T27 | "should be the undecorated URL, without session variables, user identifying parameters, or counters." | Checker note for no og:url or canonical link | https://developers.facebook.com/documentation/sharing/webmasters | 21 October 2026 |
| T15 | "max 70 characters" | Checker note for an og:title over 70 characters | https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup | 21 October 2026 (archive capture of 16 January 2026) |

T7 ("Relative URLs must start with /.", Discord) was removed from the tool page in the third round: Site QA pointed out that Discord accepting a relative URL doesn't support "use the full address". The pitfall now uses the post's wording without the Discord quote. The number is left unused so the other rows keep theirs. The post still quotes Discord there (quote 39), as the one doc that mentions relative URLs at all.

T16 and T17 are from the same TN3156 data as T13 and T14. T17 is followed in TN3156 by "Images may be displayed at varying sizes depending on context and device, potentially making text unreadable. For best results, keep the image graphical and use other metadata tags for text.", which the size list paraphrases as "suggests using the other metadata tags for text instead". T18 is part of the archived markup reference's `twitter:description` row, "Description of content (maximum 200 characters)", which matches the checker's existing 200-character threshold (`OG_DESCRIPTION_MAX`). T21 is part of post quote 1. T22 is part of the archived `twitter:image:alt` row, "A text description of the image conveying the essential nature of an image to users who are visually impaired." T23 is part of "The Summary Card with Large Image features a large, full-width prominent image alongside a tweet." T26 and T27 are from the `og:url` row of Facebook's Basic Tags table.

T13 and T14 are Apple's TN3156, "TN3156: Create rich previews for Messages" (Technote; revision history "2024-04-30 Republished as TN3156. Added social network information." and "2017-09-08 First published as TN2444 “Best Practices for Link Previews in Messages”."). The page at developer.apple.com is rendered by JavaScript, so its text was read from the documentation data Apple serves for it, `https://developer.apple.com/tutorials/data/documentation/technotes/tn3156-create-rich-previews-for-messages.json` (HTTP 200, 21 October 2026, about 08:58 UTC). The old TN2444 URL, `https://developer.apple.com/library/archive/technotes/tn2444/_index.html`, redirects to TN3156. In the data, `og:image` and `og:title` are code spans; the quotes give their text. T15 is part of the archived Cards markup reference's `twitter:title` row, "Title of content (max 70 characters)", and X falls back to `og:title` for it (same table).

T9 is part of "The Twitter web crawler re-indexes the Card tag information on your page roughly every seven days.", T10 of "Responses to these requests are cached globally across the service for around 30 minutes.", and T11 of "This can also be used to update the image for a piece of content.", which Facebook says of the Sharing Debugger (and of a Graph API scrape) under "Pre-caching images".

What changed on the page:

- **"Tags added by JavaScript" pitfall:** it used to say "Link previewers don't run JavaScript" and that "many AI-built single-page apps do" set tags in the browser. Neither had a source. It now asks you to check the tags are in the server's HTML and quotes Discord (T6), the only doc checked that says so.
- **"A relative image URL" pitfall:** it used to say a relative path "fails in most crawlers". No doc says that. It now uses the post's wording: check og:image is a full https:// address, the Open Graph protocol defines it as an image URL and every example it gives is a full URL, and Facebook's, LinkedIn's, Slack's and X's archived docs don't say they resolve a relative path, so a full URL is the safe form. An earlier version also quoted Discord (T7, removed; see above).
- **"Tags added by JavaScript" pitfall:** now has a second source, Apple's TN3156 (T16).
- **Size list:** "One idea, big type" now has an iMessage caveat quoting TN3156 (T17). The X 5MB, LinkedIn 5 MB and Facebook "much smaller" paraphrases now link their sources: X's archived Summary Card page, LinkedIn a521928 and Facebook's Images in Link Shares.
- **"SVG or a tiny logo" pitfall:** it used to say "SVGs aren't shown by Facebook, X or LinkedIn, and anything under 600×315 becomes a thumbnail." It now says some platforms don't accept SVG and quotes X's archived card docs (T1), and quotes Facebook on images under 600 x 315 (T2). Facebook and LinkedIn say nothing about SVG directly, so they aren't cited for it.
- **"Text too close to the edges" pitfall:** it used to say "Some apps crop a few pixels, and the card is often shown around 500px wide." Neither had a source. It is now plain advice to keep the headline inside the frame, with Facebook's quote on cropping off the 1.91:1 ratio (T8). The 500px figure is gone.
- **"A login wall or a blocked crawler" pitfall:** it used to say a page "blocked in robots.txt" shows a blank preview. It now asks you to check that the page and image load without a login, quoting X's archived troubleshooting docs (T3; this replaced a LinkedIn quote, see "Left out"), and says robots.txt depends on the platform, citing X (T4) and Slack, which ignores robots.txt (T5).
- **"An old cached card" pitfall:** it used to say "Apps cache the first card they see, sometimes for days" and to "share a fresh link to test". It now gives only the documented times, X's archived "roughly every seven days" (T9) and Slack's "around 30 minutes" (T10), and the documented refresh tools: Facebook's Sharing Debugger (T11) and LinkedIn's Post Inspector (T12).
- **"The 1200×630 rule" list:** "X skips images over 5 MB, and smaller files load before the person scrolls past" became X's archived "less than 5MB" and LinkedIn's 5 MB, plus advice to aim for under 1 MB. "Smaller images are shown as a little thumbnail beside the text, or dropped" became Facebook's "still display, but much smaller" (paraphrase of T2). "Readable when the card is about 500px wide on a phone" became "large enough to read on a phone". "Relative paths and http images fail in more apps than you'd expect" became a pointer to the Open Graph protocol's full-URL examples.
- **The width and height paragraph** and the checker's matching note: "Facebook and LinkedIn can show the image on the very first share" now names Facebook only, which is the only doc that says it (post quotes 29 and 40, Images in Link Shares, "Pre-caching images").
- **"Why isn't my link showing a preview image?" FAQ** (visible and FAQPage JSON-LD, which share one string): "Usually one of five things" became "Check five things", the SVG item says some platforms don't accept SVG, and "blocks crawlers" became "the platform's crawler isn't blocked". The answer is paraphrase, so it has no quotes.
- **Intro:** "Paste a live URL to see the card people get when you share it on X, LinkedIn, Slack or iMessage." claimed each app's exact card and named iMessage with no Apple source. It now reads "Paste a live URL to preview a generic link card built from the Open Graph tags that X, LinkedIn, Slack and iMessage read." The four claims are sourced: X's archived markup reference (Open Graph fallbacks), LinkedIn a525063 (post quote 14), Slack's unfurling doc (post quote 19) and Apple's TN3156 (T13, T14), which a new line under the intro quotes and links. No metadata or JSON-LD on the page named iMessage.
- **Checker notes** (`src/lib/og-check.ts`):
  - A long og:title: "X, LinkedIn and Slack cut titles off around 60 to 70 characters" had no source for 60, LinkedIn or Slack. It now cites only X's archived card docs, which give a card title a maximum of 70 characters (T15). That matches the checker's existing 70-character threshold (`OG_TITLE_MAX`).
  - No og:image: "Links share as a plain text card with no picture, which gets far fewer clicks." had no source. It now says there's no share image for apps to show and to add a 1200×630 PNG or JPG.
  - An SVG `og:image` is now a warning, not a failure, since the message is hedged: "It's an SVG, and some platforms don't accept SVG: X's archived card docs say it isn't supported."
  - Under 600×315 (still a failure): "so most apps show it as a small thumbnail or not at all" became Facebook's wording, T2, in quotation marks.
  - "Only twitter:image is set; Facebook, LinkedIn, Slack and iMessage read og:image." named iMessage with no Apple source. It now says og:image is the tag Facebook's and LinkedIn's sharing docs ask for (Images in Link Shares; LinkedIn a521928 lists og:image among the tags that must exist).
  - "many crawlers ignore relative image URLs" became the Open Graph protocol pointer.
  - "X skips images over 5 MB and big files slow every crawler down" became X's archived "less than 5MB" and LinkedIn's 5 MB.
  - Third round, every remaining note: "Apps fall back to the bare URL, which nobody clicks" became "so the card has no title of yours to show. Add og:title." "No og:title, so apps fall back to your <title>" became "No og:title, only a <title>". "so the card shows a title and nothing else. One plain sentence is enough." became the Open Graph protocol's "A one to two sentence description of your object." (T19). "Some apps use your meta description instead, others show nothing" became the protocol listing og:description as "generally recommended" (T20). "Most cards show one or two lines, so keep it under about 155" became X's archived "maximum 200 characters" (T18). "so every app will load it" was cut. "looks soft on high-density screens" became Facebook's "for the best display on high resolution devices" (T21). "the right shape and sharp enough" became "between 1.91:1 and 2:1, and at least 1200 wide". "for people using screen readers" became X's archived "users who are visually impaired" (T22). The three twitter:card notes now quote X's archived docs (T23, T24, T25) instead of "small thumbnail" and "small square thumbnail" claims. The og:url notes now quote Facebook (T26, T27) instead of "count as one link" and "?ref= or tracking links".
  - **Ratio:** "Cards are 1.91:1" warned "too wide" on a 1200×600 image, which contradicts X's documented 2:1. The check now accepts 1.91:1 through 2:1 (with the existing 5% tolerance either side) and, when it warns, says "Facebook and LinkedIn ask for 1.91:1 and X's archived docs describe 2:1" and that parts "may be cropped".
  - **File size:** the limit was 5 MiB (5,242,880 bytes), so files from 5.0 to 5.24 MB passed silently. It is now 5,000,000 bytes, and since X's archived wording is "less than 5MB", a file of exactly 5,000,000 bytes warns. The size shown is now in decimal MB.
  - **Neutral notes, with no platform claim:** no og:title and no <title>; og:title missing but a <title> present; an http image on an https page ("Serve the image over https too."); an image that didn't load; a size that couldn't be read ("PNG or JPG at 1200×630 is the safe choice."); declared width and height that don't match the file; a canonical link without og:url; and the pass notes that only restate what was found.
  - **Verdict line** (`src/components/tools/og-preview.tsx`): "This link will preview properly when you share it.", "It previews, with N things worth fixing." and "This link won't preview well yet." made claims no source supports. They now read "Every check passes.", "No failures, with N things worth fixing." and "Some checks fail. Fix the items marked in red."
  - `tests/unit/og-check.test.ts` covers the SVG warning, the under-600×315 wording, the Facebook-only first-share note, a well-tagged pass, the X-only title and description notes, the no-image note without the clicks claim, the 1.91:1 to 2:1 range (1200×600 passes and doesn't warn "too wide", 1400×630 does), the 5,000,000-byte boundary (4,999,999 passes; 5,000,000, 5,100,000 and 5,240,000 warn), and a sweep of every note across six scenarios for the old unsourced phrases.
