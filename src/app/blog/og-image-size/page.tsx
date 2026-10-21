import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";
import { OG_PREVIEW } from "@/lib/tools";

const p = post("og-image-size");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const LINKEDIN_HELP = "https://www.linkedin.com/help/linkedin/answer";
const X_ARCHIVE = "https://web.archive.org/web";
const X_DOCS = "https://developer.x.com/en/docs/x-for-websites/cards";

const SRC = {
  linkedinShareable: `${LINKEDIN_HELP}/a521928`,
  linkedinShareLinks: `${LINKEDIN_HELP}/a525301`,
  linkedinTroubleshooting: `${LINKEDIN_HELP}/a525063`,
  linkedinPostInspectorHelp: `${LINKEDIN_HELP}/a6233775`,
  linkedinPostInspector: "https://www.linkedin.com/post-inspector/",
  ogp: "https://ogp.me/",
  facebookImages: "https://developers.facebook.com/documentation/sharing/webmasters/images",
  facebookWebmasters: "https://developers.facebook.com/documentation/sharing/webmasters",
  facebookDebugger: "https://developers.facebook.com/tools/debug/",
  xLargeImage: `${X_ARCHIVE}/20260112050218/${X_DOCS}/overview/summary-card-with-large-image`,
  xMarkup: `${X_ARCHIVE}/20260116124848/${X_DOCS}/overview/markup`,
  xTroubleshooting: `${X_ARCHIVE}/20260104011518/${X_DOCS}/guides/troubleshooting-cards`,
  slackUnfurling: "https://docs.slack.dev/messaging/unfurling-links-in-messages",
  slackRobots: "https://api.slack.com/robots",
  discordLinkPreviews: "https://docs.discord.com/developers/link-previews/overview",
  discordEmbedDebugger: "https://discord.com/developers/embeds",
} as const;

const TAGS = `<meta property="og:title" content="Your page title" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://your-app.com/" />
<meta property="og:description" content="One or two sentences about the page." />
<meta property="og:image" content="https://your-app.com/og-v1.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="What the image shows" />
<meta name="twitter:card" content="summary_large_image" />`;

const FAQ: FaqItem[] = [
  {
    q: "Should a LinkedIn preview image be 1200×627 or 1200×630?",
    a: "Either works. LinkedIn's help center gives 1200 x 627 pixels as the minimum for its sharing module, with a recommended ratio of 1.91:1, and 1200×630 meets that minimum in both directions. 1200×630 is also the size Facebook recommends, so it is the one to pick if the same image has to work on both.",
  },
  {
    q: "Do I need a separate twitter:image for X?",
    a: "Not if you set og:image. X's archived Cards markup reference lists og:image as the fallback for twitter:image. What you do need is twitter:card set to summary_large_image: the same reference says that if the Open Graph tags are there but twitter:card is absent, a summary card may be rendered instead. X's card docs are no longer online, so this comes from the Internet Archive's copies from January 2026.",
  },
  {
    q: "What is the maximum file size for an OG image?",
    a: "Keep it under 5 MB. LinkedIn's limit for shared images is 5 MB, X's archived docs say images must be less than 5MB, and Facebook allows up to 8 MB. Slack doesn't publish a limit, and Discord only caps the whole fetch at 50 MB, so 5 MB is the lowest published limit.",
  },
  {
    q: "Can an OG image be an SVG or a WebP?",
    a: "Not an SVG: X's archived docs say SVG is not supported, and SVG isn't in Facebook's or Discord's list of image types either. WebP is supported in X's archived docs and in Discord's, but Facebook's og:image:type lists only JPEG, GIF and PNG. PNG or JPG is the format all three lists share.",
  },
  {
    q: "Are og:image:width and og:image:height required?",
    a: "No. The Open Graph protocol lists them as optional structured properties of og:image. They are still worth setting: Facebook says they let its crawler render the image straight away instead of downloading and processing it first, and Discord says that without them it fetches the image to measure it.",
  },
];

export default function OgImageSizePostPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        An OG image is the picture that appears when someone shares a link to your page. The <a href={SRC.ogp}>Open Graph protocol</a> defines the{" "}
        <code>og:image</code> tag, and every app that draws a link card reads it in its own way. This post collects what each platform&apos;s own documentation says about
        the size: Facebook, LinkedIn, X, Slack and Discord. Every number is quoted and linked, and where a platform doesn&apos;t publish one, the post says so.
      </p>
      <p>
        To see what your own page shares as, paste its URL into the free <Link href={OG_PREVIEW.path}>OG image preview</Link>.
      </p>

      <h2 id="quick-answer">The quick answer: 1200×630</h2>
      <p>
        Make the image 1200×630 pixels, save it as a PNG or JPG under 5 MB, and serve it from a full <code>https://</code> URL. One image at that size fits what the
        documentation below asks for:
      </p>
      <ul>
        <li>
          <strong>It is Facebook&apos;s recommended size.</strong> Meta&apos;s <a href={SRC.facebookImages}>Images in Link Shares</a> page says{" "}
          <q>Use images that are at least 1200 x 630 pixels for the best display on high resolution devices.</q>
        </li>
        <li>
          <strong>It meets LinkedIn&apos;s minimum.</strong> LinkedIn&apos;s <a href={SRC.linkedinShareable}>Make your website shareable on LinkedIn</a> article gives{" "}
          <q>Minimum image dimensions: 1200 (w) x 627 (h) pixels</q>, and 1200×630 is at least that in both directions.
        </li>
        <li>
          <strong>It is close to the ratio both ask for.</strong> LinkedIn gives <q>Recommended ratio: 1.91:1</q>, and Facebook says{" "}
          <q>Try to keep your images as close to 1.91:1 aspect ratio as possible to display the full image in Feed without any cropping.</q> 1200 divided by 630 is about
          1.905.
        </li>
        <li>
          <strong>It is inside X&apos;s limits, though not X&apos;s shape.</strong> X&apos;s <a href={SRC.xLargeImage}>archived docs</a> describe a 2:1 image between a minimum and a maximum size that
          1200×630 sits well inside. See <a href="#x">X</a> below.
        </li>
        <li>
          <strong>Under 5 MB clears every published file limit.</strong> LinkedIn caps shared images at 5 MB, X&apos;s archived docs ask for less than 5MB, and Facebook
          allows 8 MB.
        </li>
      </ul>
      <p>
        Slack publishes no image size at all, and Discord only uses 1200 and 630 in an example, so neither gives you a different number to design for.
      </p>

      <h2 id="platforms">What each platform&apos;s docs say</h2>
      <p>Each platform&apos;s pages were read on 21 October 2026. Here is what they say, and what they leave out.</p>

      <h3 id="facebook">Facebook</h3>
      <p>
        Meta&apos;s <a href={SRC.facebookImages}>Images in Link Shares</a> page (dated 30 June 2026) is the most detailed of the five. Apart from the 1200 x 630
        recommendation and the 1.91:1 ratio above, it says:
      </p>
      <ul>
        <li>
          <strong>A hard minimum.</strong> <q>The minimum allowed image dimension is 200 x 200 pixels.</q>
        </li>
        <li>
          <strong>A minimum for the large card.</strong> <q>At the minimum, you should use images that are 600 x 315 pixels to display link page posts with larger
          images.</q> Below that, <q>If your image is smaller than 600 x 315 px, it will still display in the link page post, but the size will be much smaller.</q>
        </li>
        <li>
          <strong>A file limit.</strong> <q>The size of the image file must not exceed 8 MB.</q>
        </li>
      </ul>
      <p>
        Facebook takes the card&apos;s title, description and image from Open Graph tags when they&apos;re there. Its <a href={SRC.facebookWebmasters}>guide to sharing for webmasters</a> says{" "}
        <q>Most content is shared to Facebook as a URL, so it’s important that you mark up your website with Open Graph tags to take control over how your content appears on
        Facebook.</q> Without them, <q>the Facebook Crawler uses internal heuristics to make a best guess about the title, description, and preview image for your
        content.</q>
      </p>

      <h3 id="linkedin">LinkedIn</h3>
      <p>
        LinkedIn&apos;s <a href={SRC.linkedinShareable}>Make your website shareable on LinkedIn</a> help article lists the{" "}
        <q>image requirements specific to the LinkedIn sharing module</q>: the 1200 x 627 minimum and 1.91:1 ratio above, and <q>Max file size: 5 MB</q>. The same
        article then lists separate specifications for single image ads, which are for paid ads rather than a shared link. Its{" "}
        <a href={SRC.linkedinShareLinks}>Share articles or links</a> article describes the preview the same way:{" "}
        <q>image frame is a 1.91:1 ratio and 1200 (w) x 627 (h) pixels</q>.
      </p>
      <p>
        LinkedIn reads Open Graph tags too. Its <a href={SRC.linkedinTroubleshooting}>troubleshooting article</a> says{" "}
        <q>The LinkedIn share box relies on websites to use oEmbeds and/or Open Graph Protocol (OGP) to display the most accurate title, description, and image when sharing
        a URL.</q> These help articles show as last updated two or three years ago, so check them again before you rely on the numbers.
      </p>

      <h3 id="x">X (from its archived docs)</h3>
      <p>
        X&apos;s card documentation is no longer online: the old developer.x.com card pages now redirect to the general docs overview, and the same paths on docs.x.com
        return 404. Everything in this section comes from X&apos;s archived developer docs, as saved by the Internet Archive: the{" "}
        <a href={SRC.xLargeImage}>Summary Card with Large Image</a> page from 12 January 2026, the <a href={SRC.xMarkup}>Cards markup</a> reference from 16 January 2026
        and <a href={SRC.xTroubleshooting}>Troubleshooting Cards</a> from 4 January 2026. X may have changed how cards work since then.
      </p>
      <ul>
        <li>
          <strong>Size and ratio.</strong> <q>Images for this Card support an aspect ratio of 2:1 with minimum dimensions of 300x157 or maximum of 4096x4096 pixels.</q>
        </li>
        <li>
          <strong>File size and formats.</strong> <q>Images must be less than 5MB in size. JPG, PNG, WEBP and GIF formats are supported. Only the first frame of an animated
          GIF will be used. SVG is not supported.</q>
        </li>
        <li>
          <strong>The card type.</strong> For the large card, <code>twitter:card</code> <q>Must be set to a value of “summary_large_image”</q>. The markup reference warns{" "}
          <q>If an og:type, og:title and og:description exist in the markup but twitter:card is absent, then a summary card may be rendered.</q>
        </li>
        <li>
          <strong>Open Graph as the fallback.</strong> The markup reference lists <code>og:image</code> as the fallback for <code>twitter:image</code>, and{" "}
          <code>og:title</code> and <code>og:description</code> for the title and description, so you don&apos;t need a second image just for X.
        </li>
      </ul>

      <h3 id="slack">Slack</h3>
      <p>
        Slack doesn&apos;t publish an image size: no dimensions, no ratio and no file limit. Its <a href={SRC.slackUnfurling}>Unfurling links in messages</a> doc says that
        when no app handles a link, <q>Slack crawls the URL, looks for common OpenGraph and X (formerly known as Twitter) Card metadata, and renders some
        micro-approximation of the content.</q> Its <a href={SRC.slackRobots}>Slack Robots</a> page describes the crawler:{" "}
        <q>It fetches as little of the page as it can (using HTTP Range headers) to extract meta tags about the content.</q> and{" "}
        <q>If a page&apos;s tags refer to an image, video, or audio file, we will fetch that file as well to check validity and extract other metadata.</q>
      </p>
      <p>So Slack uses the same <code>og:image</code> as everyone else, but there is no Slack number to design for.</p>

      <h3 id="discord">Discord</h3>
      <p>
        Discord&apos;s <a href={SRC.discordLinkPreviews}>Link Previews</a> doc doesn&apos;t recommend a size either. The only places 1200 and 630 appear are its Quick Start
        example, which sets <code>og:image:width</code> to 1200 and <code>og:image:height</code> to 630, and an oEmbed example that uses the same numbers for a thumbnail.
        They are examples, not a requirement. The doc does say <q>Supported formats are .png, .gif, .jpg, .jpeg, .webp, and .avif.</q>, and it carries a warning:{" "}
        <q>Link previews are subject to change.</q>
      </p>

      <h3 id="open-graph">The Open Graph protocol</h3>
      <p>
        The <a href={SRC.ogp}>protocol itself</a> sets no image size. It defines <code>og:image</code> as <q>An image URL which should represent your object within the
        graph.</q> and gives it optional structured properties, including <code>og:image:width</code> (<q>The number of pixels wide.</q>), <code>og:image:height</code>{" "}
        (<q>The number of pixels high.</q>) and <code>og:image:alt</code>, about which it says{" "}
        <q>If the page specifies an og:image it should specify og:image:alt.</q>
      </p>

      <h3 id="disagree">Where the docs disagree</h3>
      <ul>
        <li>
          <strong>Ratio.</strong> Facebook and LinkedIn say 1.91:1. X&apos;s archived docs say 2:1. No single image matches both exactly. A 2:1 image at 1200 wide would be
          1200×600, which is below LinkedIn&apos;s 627-pixel minimum height, so 1200×630 is the better compromise. None of the docs say exactly how an image of the other shape
          is fitted, so keep your product name and headline away from the edges and check the card before you launch.
        </li>
        <li>
          <strong>Minimum size.</strong> Facebook allows 200 x 200 and wants 600 x 315 for the large card, X&apos;s archived docs allow 300x157, and LinkedIn asks for 1200 x
          627. LinkedIn&apos;s is the strictest, so it sets the floor.
        </li>
        <li>
          <strong>File size.</strong> LinkedIn says 5 MB, X&apos;s archived docs say less than 5MB, and Facebook says 8 MB.
        </li>
        <li>
          <strong>No number at all.</strong> Slack and the Open Graph protocol publish no image size, and Discord only shows one in an example.
        </li>
      </ul>

      <h2 id="meta-tags">The meta tags to set</h2>
      <p>
        Put these in the <code>&lt;head&gt;</code> of the HTML your server sends, with your own values. The first four are what the Open Graph protocol calls{" "}
        <q>The four required properties for every page</q>: <code>og:title</code>, <code>og:type</code>, <code>og:url</code> and <code>og:image</code>.
      </p>
      <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 text-xs leading-relaxed sm:text-sm" data-testid="og-size-tags">
        <code>{TAGS}</code>
      </pre>
      <ul>
        <li>
          <strong>Width and height.</strong> Optional in the protocol, but <a href={SRC.facebookImages}>Facebook says</a> they <q>will specify the image dimensions to the crawler so that it can render the
          image immediately without having to asynchronously download and process it.</q> <a href={SRC.discordLinkPreviews}>Discord&apos;s doc</a> says{" "}
          <q>Provide og:image:width and og:image:height. Without them, Discord fetches the image to measure it.</q>
        </li>
        <li>
          <strong>Alt text.</strong> The protocol describes <code>og:image:alt</code> as{" "}
          <q>A description of what is in the image (not a caption).</q>
        </li>
        <li>
          <strong>twitter:card.</strong> Without <code>summary_large_image</code>, X&apos;s archived docs say you may get the small summary card instead.
        </li>
        <li>
          <strong>Description length.</strong> The protocol suggests <q>A one to two sentence description of your object.</q> <a href={SRC.facebookWebmasters}>Facebook&apos;s guide</a> says{" "}
          <q>A brief description of the content, usually between 2 and 4 sentences.</q> One or two sentences satisfies both.
        </li>
      </ul>
      <p>
        A version number in the image file name, like <code>og-v1.png</code>, makes the next change easier. See <a href="#cache">an old cached card</a> below.
      </p>

      <h2 id="testing">How to test your OG image</h2>
      <ul>
        <li>
          <strong>LinkedIn: Post Inspector.</strong> LinkedIn&apos;s <a href={SRC.linkedinPostInspectorHelp}>help article</a> says{" "}
          <q>You can use the Post Inspector as a tool to refresh the URL.</q> Open <a href={SRC.linkedinPostInspector}>Post Inspector</a>, enter the URL, and{" "}
          <q>Confirm that the preview window shows the correct content.</q> It only helps future posts: <q>The preview for any existing posts with this URL will remain the
          same.</q>
        </li>
        <li>
          <strong>Facebook: Sharing Debugger.</strong> Facebook&apos;s <a href={SRC.facebookWebmasters}>webmaster guide</a> says the <a href={SRC.facebookDebugger}>Sharing Debugger</a>{" "}
          <q>will show which meta tags the crawler scrapes as well as any errors or warnings.</q>
        </li>
        <li>
          <strong>Discord: Embed Debugger.</strong> <a href={SRC.discordLinkPreviews}>Discord&apos;s doc</a> points to the <a href={SRC.discordEmbedDebugger}>Embed Debugger</a>,{" "}
          <q>which shows how Discord reads a URL, including which tags it picked up and which layout it chose.</q>
        </li>
        <li>
          <strong>X and Slack.</strong> X&apos;s archived docs mention a Card Validator, but with the card docs gone this post doesn&apos;t send you there, and Slack&apos;s
          unfurling doc doesn&apos;t mention a preview tool. Post the link from a test account on X, or paste it into a Slack message to yourself.
        </li>
        <li>
          <strong>Any page: our OG image preview.</strong> The free <Link href={OG_PREVIEW.path}>OG image preview</Link> fetches a live page the way a link previewer would
          and shows the common large card at 1200×630. It checks <code>og:title</code>, <code>og:description</code>, <code>og:url</code>, the image&apos;s real size, format
          and file size, the width, height and alt tags, and <code>twitter:card</code>, and tells you what to fix. It&apos;s free with no sign-up and doesn&apos;t save the URL.
          It shows one common layout rather than each app&apos;s exact card, and it can&apos;t clear another platform&apos;s cache, so use the tools above for that.
        </li>
      </ul>

      <h2 id="mistakes">Common mistakes to check for</h2>
      <p>None of these platforms says how often each problem happens, so treat this as a list of checks rather than a ranking.</p>
      <h3 id="relative-url">A relative image URL</h3>
      <p>
        Check that <code>og:image</code> is a full <code>https://</code> address. The protocol defines it as an image URL, and of the docs here only <a href={SRC.discordLinkPreviews}>Discord&apos;s</a>{" "}
        mentions relative URLs at all: <q>Relative URLs must start with /.</q> The others don&apos;t say they resolve a relative path, so a full URL is the safe form.
      </p>
      <h3 id="width-height">No width and height</h3>
      <p>
        On Facebook, without declared dimensions, the first share can come out without an image. <a href={SRC.facebookImages}>Facebook says</a> <q>The crawler has to see an image at least once before it can be
        rendered.</q> and <q>This means that the first person who shares a piece of content won’t see a rendered image</q>. Setting <code>og:image:width</code> and{" "}
        <code>og:image:height</code> is one of the three fixes it lists.
      </p>
      <h3 id="cache">An old cached card</h3>
      <p>Every platform here caches what it fetches, and they say different things about how:</p>
      <ul>
        <li>
          <strong><a href={SRC.facebookImages}>Facebook</a></strong> caches images by URL: <q>Use a new URL for the new image or the image won’t be updated</q>.
        </li>
        <li>
          <strong><a href={SRC.linkedinTroubleshooting}>LinkedIn</a></strong> says <q>Please allow 48 hours from the last time you&apos;ve shared this URL before you try again.</q> Post Inspector, above, refreshes
          it for new posts.
        </li>
        <li>
          <strong><a href={SRC.xTroubleshooting}>X</a></strong>, in its archived docs: <q>The Twitter web crawler re-indexes the Card tag information on your page roughly every seven days.</q> and{" "}
          <q>Images referenced in a Card are also cached based on URL.</q>
        </li>
        <li>
          <strong><a href={SRC.slackRobots}>Slack</a></strong>: <q>Responses to these requests are cached globally across the service for around 30 minutes.</q>
        </li>
        <li>
          <strong><a href={SRC.discordLinkPreviews}>Discord</a></strong>: <q>Discord caches previews for about 30 minutes.</q> Its tip for testing: share the URL with a new query string, such as{" "}
          <code>?v=2</code>.
        </li>
      </ul>
      <p>
        So when you change the image, give it a new file name or URL and update the tag to match, then refresh the card with the tools above or wait for the cache to
        expire.
      </p>
      <h3 id="javascript">Tags added by JavaScript</h3>
      <p>
        Check the tags are in the HTML your server sends, not added in the browser. <a href={SRC.discordLinkPreviews}>Discord&apos;s doc</a> is explicit:{" "}
        <q>The tags must be in the HTML your server sends. No code is executed, so tags added by a client-side script after load are never seen.</q> Slack&apos;s crawler
        fetches as little of the page as it can, which is another reason to keep the tags near the top of the <code>&lt;head&gt;</code>.
      </p>
      <h3 id="blocked">An image the crawler can&apos;t reach</h3>
      <p>
        Check that both the page and the image load without a login, from outside your network. X&apos;s archived <a href={SRC.xTroubleshooting}>troubleshooting page</a> says that when an image
        doesn&apos;t show, <q>The most common cause is that the image specified via the twitter:image tag is not publicly accessible on the web.</q> <a href={SRC.linkedinShareable}>LinkedIn says</a> that if the image
        meets the requirements and still doesn&apos;t appear,{" "}
        <q>your website may be blocking us from pulling the image or the image may be located on a protected directory or website.</q> Robots rules differ: X&apos;s archived
        docs list <q>Your website has a robots.txt file that is blocking Twitter from getting your Card metadata.</q> as a cause, while <a href={SRC.slackRobots}>Slack&apos;s Robots page</a> says{" "}
        <q>We do not currently honor robots.txt files.</q> <a href={SRC.facebookImages}>Facebook</a> adds a server check: <q>Our crawler only accepts gzip and deflate encodings, so make sure your server
        uses the right encoding.</q>
      </p>

      <h2 id="launch-images">Images for launch day</h2>
      <p>
        The OG image is the card for a shared link. A launch post on X or LinkedIn can carry its own attached image as well, and its size is a house style choice rather
        than a platform rule: none of the docs above set a size for it. LaunchLoop&apos;s house style is a 1600×900 image for launch posts.
      </p>
      <p>
        Product Hunt has its own image sizes, which the <Link href="/product-hunt-launch-checklist#images">Product Hunt launch checklist</Link> covers. For the listing
        itself, read <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link> and{" "}
        <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt tagline</Link>.
      </p>
      <p>
        If you&apos;d rather not make all of this by hand, LaunchLoop reads your repo and live page and drafts your landing page copy, Product Hunt post, X thread and LinkedIn
        post, plus a 1200×630 OG image, a 1600×900 post image and a 1270×760 Product Hunt gallery image in your site&apos;s colours. The drafts are yours to edit and post.
        Start with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="OG image size: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of October 2026. Every quote on this page was read on 21 October 2026, on each platform&apos;s own site or, for X, in the Internet Archive&apos;s copies of
        X&apos;s developer docs from January 2026. These pages change without notice, so check the links before you rely on a number.
      </p>
      <ul>
        <li><a href={SRC.facebookImages}>Images in Link Shares</a>, Meta for Developers (dated 30 June 2026)</li>
        <li><a href={SRC.facebookWebmasters}>A Guide to Sharing for Webmasters</a>, Meta for Developers (dated 30 June 2026)</li>
        <li><a href={SRC.linkedinShareable}>Make your website shareable on LinkedIn</a>, LinkedIn Help</li>
        <li><a href={SRC.linkedinShareLinks}>Share articles or links</a>, LinkedIn Help</li>
        <li><a href={SRC.linkedinTroubleshooting}>Troubleshooting issues sharing URLs</a>, LinkedIn Help</li>
        <li><a href={SRC.linkedinPostInspectorHelp}>Use Post Inspector to refresh URL</a>, LinkedIn Help</li>
        <li><a href={SRC.xLargeImage}>Summary Card with Large Image</a>, X developer docs, archived 12 January 2026</li>
        <li><a href={SRC.xMarkup}>Cards markup</a>, X developer docs, archived 16 January 2026</li>
        <li><a href={SRC.xTroubleshooting}>Troubleshooting Cards</a>, X developer docs, archived 4 January 2026</li>
        <li><a href={SRC.slackUnfurling}>Unfurling links in messages</a>, Slack Developer Docs</li>
        <li><a href={SRC.slackRobots}>Slack Robots</a>, Slack API</li>
        <li><a href={SRC.discordLinkPreviews}>Link Previews</a>, Discord Developer Docs</li>
        <li><a href={SRC.ogp}>The Open Graph protocol</a>, ogp.me</li>
      </ul>
    </BlogPostLayout>
  );
}
