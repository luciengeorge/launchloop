import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { KitPrice, PricedText } from "@/components/kit-price";
import { OgPreview } from "@/components/tools/og-preview";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { siteUrl } from "@/lib/env";
import { OG_IMAGE, OG_MIN } from "@/lib/og-check";
import { PAGES, toolPage } from "@/lib/pages";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { pageMetadata } from "@/lib/seo";
import { SITE, kitPriceText } from "@/lib/site";
import { breadcrumbs, faqPage } from "@/lib/structured-data";
import { OG_FAQ, OG_PREVIEW as tool, TAGLINE_CHECKER, type ToolFaqItem } from "@/lib/tools";

export const metadata: Metadata = pageMetadata(toolPage(tool));

const SIZE = `${OG_IMAGE.width}×${OG_IMAGE.height}`;

const TAGS = `<meta property="og:title" content="Turn your GitHub repo into a launch kit" />
<meta property="og:description" content="Launch copy and images, from your README and commits." />
<meta property="og:image" content="https://your-app.com/og.png" />
<meta property="og:image:width" content="${OG_IMAGE.width}" />
<meta property="og:image:height" content="${OG_IMAGE.height}" />
<meta property="og:image:alt" content="Your app's name and headline on a plain background" />
<meta property="og:url" content="https://your-app.com/" />
<meta name="twitter:card" content="summary_large_image" />`;

const SRC = {
  xCard: "https://web.archive.org/web/20260112050218/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image",
  xTroubleshooting: "https://web.archive.org/web/20260104011518/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards",
  facebookImages: "https://developers.facebook.com/documentation/sharing/webmasters/images",
  linkedinShareable: "https://www.linkedin.com/help/linkedin/answer/a521928",
  slackRobots: "https://api.slack.com/robots",
} as const;

const LINK = "font-medium text-foreground underline underline-offset-4";

const PITFALLS: { title: string; body: React.ReactNode }[] = [
  { title: "Tags added by JavaScript", body: "Link previewers don't run JavaScript. If your app sets its title and og:image in the browser, which many AI-built single-page apps do, crawlers see an empty page. Put the tags in the HTML the server sends." },
  { title: "A relative image URL", body: "og:image=\"/og.png\" works in a browser and fails in most crawlers. Use the full https:// address." },
  {
    title: "SVG or a tiny logo",
    body: (
      <>
        Some platforms don&apos;t accept SVG: X&apos;s <a href={SRC.xCard} className={LINK}>archived card docs</a> say <q>SVG is not supported.</q> Use a PNG or JPG at {SIZE}.
        Small images shrink too: <a href={SRC.facebookImages} className={LINK}>Facebook</a> says an image under 600 x 315{" "}
        <q>will still display in the link page post, but the size will be much smaller.</q>
      </>
    ),
  },
  { title: "Text too close to the edges", body: "Some apps crop a few pixels, and the card is often shown around 500px wide. Keep the headline large, centred and well inside the frame." },
  {
    title: "A login wall or a blocked crawler",
    body: (
      <>
        Check that the page and the image both load without a login. <a href={SRC.linkedinShareable} className={LINK}>LinkedIn</a> says a missing image can mean{" "}
        <q>your website may be blocking us from pulling the image or the image may be located on a protected directory or website.</q> Rules in robots.txt depend on the
        platform: X&apos;s <a href={SRC.xTroubleshooting} className={LINK}>archived troubleshooting docs</a> list{" "}
        <q>Your website has a robots.txt file that is blocking Twitter from getting your Card metadata.</q> as a cause, while{" "}
        <a href={SRC.slackRobots} className={LINK}>Slack</a> says <q>We do not currently honor robots.txt files.</q>
      </>
    ),
  },
  { title: "An old cached card", body: "Apps cache the first card they see, sometimes for days. After fixing your tags, refresh it with the Facebook Sharing Debugger or LinkedIn Post Inspector, and share a fresh link to test." },
];

/** The FAQPage answer for an item: the visible text, with its "more" link as an <a>, which Google allows in Answer text. */
function faqAnswerHtml(base: string, item: ToolFaqItem, promo: boolean): string {
  const text = kitPriceText(item.a, promo);
  return item.more ? `${text} <a href="${base}${item.more.href}">${item.more.label}</a>` : text;
}

const prose =
  "space-y-5 leading-relaxed [&_h2]:mt-14 [&_h2]:scroll-mt-20 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_p]:text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-foreground";

export default async function OgPreviewPage() {
  const base = siteUrl();
  const url = `${base}${tool.path}`;
  const promo = await isLaunchPromoOn();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              "@id": `${url}#app`,
              name: "OG Image Preview",
              url,
              description: tool.description,
              image: `${url}/opengraph-image`,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              browserRequirements: "Requires JavaScript",
              inLanguage: "en-GB",
              isAccessibleForFree: true,
              featureList: [
                "Live Open Graph link card preview at 1200×630",
                "Reads the real size, format and file size of og:image",
                "Checks og:title, og:description, og:url, image width, height and alt tags, and twitter:card",
                "Plain-English fixes for every missing or wrong tag",
              ],
              offers: { "@type": "Offer", price: "0", priceCurrency: "GBP", availability: "https://schema.org/InStock" },
              publisher: { "@id": `${base}/#organization`, "@type": "Organization", name: SITE.name, url: `${base}/` },
            },
            faqPage(
              `${url}#faq`,
              OG_FAQ.map((item) => ({ q: item.q, a: faqAnswerHtml(base, item, promo) })),
            ),
            breadcrumbs(base, [
              { name: "Tools", path: PAGES.tools.path },
              { name: tool.title, path: tool.path },
            ]),
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span>{" "}
        <Link href={PAGES.tools.path} className="hover:text-foreground">Tools</Link> <span aria-hidden="true">/</span>{" "}
        <span aria-current="page">OG preview</span>
      </nav>

      <header className="mt-4 max-w-3xl space-y-4">
        <Badge variant="outline" className="bg-background px-3 py-1 text-xs">Free · No sign-up</Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{tool.title}</h1>
        <p className="text-pretty text-lg text-muted-foreground">
          Paste a live URL to see the card people get when you share it on X, LinkedIn, Slack or iMessage. We read your Open Graph tags, measure the real share image against{" "}
          {SIZE} and tell you exactly what to fix before launch day.
        </p>
      </header>

      <section aria-label="OG preview tool" className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-lg shadow-primary/5 sm:p-6">
        <OgPreview promo={promo} />
        <noscript>
          <p className="mt-4 text-sm text-muted-foreground">
            The live preview needs JavaScript. The tips below cover everything it checks: a {SIZE} PNG or JPG at a full https:// URL, og:title, og:description, og:url,
            image width, height and alt tags, and twitter:card set to summary_large_image.
          </p>
        </noscript>
      </section>

      <div className={`mt-6 max-w-3xl ${prose}`}>
        <h2 id="size">The {SIZE} rule</h2>
        <ul>
          <li>
            <strong>{SIZE} pixels, a 1.91:1 ratio.</strong> It&apos;s the size Facebook recommends and it meets LinkedIn&apos;s 1200×627 minimum. X&apos;s archived docs
            describe a 2:1 image and Slack publishes no size, so it&apos;s the safest single size rather than an exact match everywhere.
          </li>
          <li>
            <strong>PNG or JPG, ideally under 1 MB.</strong> X skips images over 5 MB, and smaller files load before the person scrolls past.
          </li>
          <li>
            <strong>Never below {OG_MIN.width}×{OG_MIN.height}.</strong> Smaller images are shown as a little thumbnail beside the text, or dropped.
          </li>
          <li>
            <strong>One idea, big type.</strong> Your product name and a short headline, readable when the card is about 500px wide on a phone. Keep it away from the
            edges.
          </li>
          <li>
            <strong>A full https:// URL.</strong> Relative paths and http images fail in more apps than you&apos;d expect.
          </li>
        </ul>

        <h2 id="tags">The tags every page needs</h2>
        <p>Put these in the <code>&lt;head&gt;</code> of the HTML your server sends, with your own values:</p>
      </div>
      <pre className="mt-5 max-w-3xl overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 text-xs leading-relaxed sm:text-sm" data-testid="og-tags-example">
        <code>{TAGS}</code>
      </pre>
      <div className={`max-w-3xl ${prose}`}>
        <p>
          The width, height and alt tags are optional but worth it: with the size declared, Facebook and LinkedIn can show the image on the very first share instead of
          waiting to download it.
        </p>

        <h2 id="pitfalls">Common pitfalls</h2>
      </div>
      <ul className="mt-5 grid max-w-3xl gap-3 sm:grid-cols-2" data-testid="og-pitfalls">
        {PITFALLS.map((p) => (
          <li key={p.title} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">{p.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
          </li>
        ))}
      </ul>

      <div className={`max-w-3xl ${prose}`}>
        <h2 id="launch-images">The other launch images</h2>
        <p>Your OG image covers every shared link. A launch needs a few more sizes:</p>
        <ul>
          <li><strong>Product Hunt gallery: 1270×760.</strong> Three to five images, leading with the result rather than your login screen, plus a 240×240 thumbnail.</li>
          <li><strong>X and LinkedIn launch posts: 1600×900.</strong> A 16:9 image attached to the post itself, not just the link card.</li>
        </ul>
        <p>
          The <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link> covers every size and launch-day step, and the{" "}
          <Link href={TAGLINE_CHECKER.path}>Product Hunt tagline checker</Link> gets your 60-character tagline right. Built with Cursor, Lovable, Bolt or v0? Read{" "}
          <Link href="/how-to-launch-a-vibe-coded-app">how to launch a vibe-coded app</Link> for the other SEO basics AI builders skip. Posting a Show HN? Hacker News lists
          plain text links, but readers share the good ones on X and Slack, where this card shows up. The <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link>{" "}
          covers the rest. Sharing on Reddit? Link posts there show a preview image too, and{" "}
          <Link href="/how-to-promote-on-reddit">how to promote your app on Reddit</Link> covers the self-promotion rules.
        </p>

        <h2 id="faq">OG preview FAQ</h2>
        <div className="space-y-8">
          {OG_FAQ.map((item) => (
            <section key={item.q}>
              <h3>{item.q}</h3>
              <p className="mt-2">
                <PricedText text={item.a} promo={promo} />
                {item.more ? (
                  <>
                    {" "}
                    <Link href={item.more.href}>{item.more.label}</Link>
                  </>
                ) : null}
              </p>
            </section>
          ))}
        </div>
      </div>

      <aside className="mt-16 flex flex-col items-start gap-4 rounded-3xl bg-foreground px-6 py-10 text-background sm:px-10">
        <h2 className="max-w-xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Link card sorted. Now get the rest of your launch.</h2>
        <p className="max-w-xl text-background/75">
          Paste your repo and {SITE.name} makes your OG, X and Product Hunt images in your brand colours, and drafts your Product Hunt post, maker comment, X thread and
          LinkedIn post, all inside each platform&apos;s limits. The preview is free; the full kit is <KitPrice promo={promo} />.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/#start" className={buttonVariants({ size: "lg", className: "h-11 px-5 text-base" })}>Get my free preview</Link>
          <Link href="/pricing" className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 border-background/30 bg-transparent px-5 text-base text-background hover:bg-background/10 hover:text-background" })}>
            See pricing
          </Link>
        </div>
      </aside>
    </div>
  );
}
