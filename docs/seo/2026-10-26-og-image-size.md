# Source check: OG image size, 26 October 2026

Blog post requested on Wednesday 21 October 2026, to publish on Monday 26 October 2026. Sources were read on 21 October 2026 between about 07:15 and 07:40 UTC. Every quote on the page was copied from the fetched page, not from memory or a search snippet, and then checked again by script (see Method).

## Page

**URL:** `/blog/og-image-size`
**Title:** `OG image size: X, LinkedIn, Facebook and Slack · LaunchLoop` (59 characters). Facebook's doc was readable, so the title keeps Facebook (the fallback title without it wasn't needed).
**Description:** `Open Graph image size from each platform's own docs: a safe 1200×630 default, what Facebook, LinkedIn, X and Slack say, the tags to set and how to test it.` (155 characters)
**H1:** OG image size for X, LinkedIn, Facebook and Slack. **Published and updated:** 2026-10-26 (the date in the brief; bump both in `src/lib/blog.ts` if it merges on another day). **Byline:** Lucien George. **Reading time:** 15 min (2,965 words / 200).

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
- Each page was saved and reduced to plain text, and a script searched for every `<q>` on the post in it: 53 of 53 match word for word, keeping each page's own apostrophes (Facebook uses curly ones).
- Cross-check: every non-X quote was also searched for in the Internet Archive's latest capture of its page (June to October 2026, dates in the table). All 45 match. The two differences are formatting only: Facebook's archived Markdown copies use straight apostrophes where the live pages have curly ones (rows 9, 41 and 42), and "Facebook Crawler" is a link in the archived webmasters guide (row 10). The 8 X quotes are from the archive captures themselves.

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
| 50 | "your website may be blocking us from pulling the image or the image may be located on a protected directory or website." | https://www.linkedin.com/help/linkedin/answer/a521928 | yes (2026-08-17) |
| 51 | "Your website has a robots.txt file that is blocking Twitter from getting your Card metadata." | https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards | is the archive copy |
| 52 | "We do not currently honor robots.txt files." | https://api.slack.com/robots | yes (2026-10-05) |
| 53 | "Our crawler only accepts gzip and deflate encodings, so make sure your server uses the right encoding." | https://developers.facebook.com/documentation/sharing/webmasters/images | yes (2026-10-10) |
## Paraphrased claims and their sources

- 1200×630 is "at least" LinkedIn's 1200 x 627 minimum in both directions, and 1200 / 630 is about 1.905: arithmetic on the quoted figures.
- 1200×630 sits inside X's archived 300x157 minimum and 4096x4096 maximum: arithmetic on quote 15.
- A 2:1 image at 1200 wide is 1200×600, below LinkedIn's 627-pixel minimum height: arithmetic on quotes 2 and 15.
- LinkedIn's single image ads specifications are separate from the sharing module: a521928 lists them under "The image specifications for single image ads are:".
- X's archived markup reference lists `og:image` as the fallback for `twitter:image`, and `og:title` / `og:description` for the title and description: the "OpenGraph" column of the tag table.
- Facebook's `og:image:type` lists only JPEG, GIF and PNG: "MIME type of the image. One of image/jpeg, image/gif or image/png" (webmasters guide, Images table).
- Discord's only 1200 and 630 are in the Quick Start example (`og:image:width` 1200, `og:image:height` 630) and the oEmbed example (`thumbnail_width` 1200, `thumbnail_height` 630). The doc has no recommended size.
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
- **No size published:** Slack, Discord (example only) and ogp.me.

## Left out

- **Facebook:** nothing had to be cut. The doc was readable via a browser-like fetch, so Facebook stays in the title and its sizes are quoted.
- **LinkedIn single image ads specs** (JPG, PNG or GIF, 7680 x 4320 maximum, 640 x 360 minimum and the square and vertical sizes): they're for paid ads, not shared links.
- **LinkedIn's "Images less than 401 pixels wide display as a thumbnail image."**: it sits after the ads specifications in a521928, so it isn't clear which section it belongs to.
- **LinkedIn's three-day share box note** in "Edit a shared post" (a522811): only seen in a search result, not fetched, so not used.
- **X's other limits** (`twitter:image:alt` maximum 420 characters, title 70 and description 200 characters, the 2 MB page limit, the 144 x 144 minimum on the troubleshooting page, TLS and IP ranges): not needed for the size question, and the 144 x 144 figure conflicts with the 300x157 on the card page.
- **Discord's other limits** (title 70 bytes, description 350 bytes, 4 images per link, 5 links per message): not about the image size.
- **Product Hunt image sizes:** left to `/product-hunt-launch-checklist#images`, which the post links.
- **Any stats on how often each mistake happens:** none of the sources give one, and the post says the list is checks, not a ranking.
- **Any LaunchLoop metric or testimonial:** none used.

## Follow-ups

- Done in this PR after review: the interactive tool's caption in `src/components/tools/og-preview.tsx` used to say the preview frame is "The large card X, LinkedIn, Slack, Facebook and iMessage are based on". It now calls it a generic large-card preview, says each platform crops and renders link cards a little differently, and links to `/blog/og-image-size`. No Apple source was read, so it says nothing about iMessage.
- The tool page's pitfall "SVGs aren't shown by Facebook, X or LinkedIn" and "blocked in robots.txt" are unsourced; X's archived docs back the SVG claim for X only, and Slack says it ignores robots.txt.
