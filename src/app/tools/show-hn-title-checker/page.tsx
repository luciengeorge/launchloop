import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { KitPrice } from "@/components/kit-price";
import { ShowHnChecker } from "@/components/tools/show-hn-checker";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { siteUrl } from "@/lib/env";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { PAGES, toolPage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { HN_QUOTES, HN_SOURCES, RULE_BY_ID, SHOW_HN_EXAMPLES, SHOW_HN_RULES, type HnQuote, type ShowHnRule } from "@/lib/show-hn-check";
import { SITE } from "@/lib/site";
import { breadcrumbs, faqPage } from "@/lib/structured-data";
import { OG_PREVIEW, SHOW_HN_FAQ, SHOW_HN_CHECKER as tool, TAGLINE_CHECKER, type ToolFaqItem } from "@/lib/tools";

export const metadata: Metadata = pageMetadata(toolPage(tool));

const FETCHED = "27 October 2026";

const NOT_CHECKED: { title: string; quote: HnQuote }[] = [
  { title: "It's something people can play with.", quote: HN_QUOTES.playWith },
  { title: "It's non-trivial.", quote: HN_QUOTES.nonTrivial },
  { title: "It's your own work, and you're around.", quote: HN_QUOTES.personal },
  { title: "You wrote the text yourself.", quote: HN_QUOTES.generatedComments },
  { title: "The title isn't misleading.", quote: HN_QUOTES.editorialize },
];

const FIELD_LABEL: Record<ShowHnRule["field"], string> = { title: "Title", comment: "Text", both: "Title and text" };

/** The FAQPage answer for an item: the visible text, with its "more" link as an <a>, which Google allows in Answer text. */
function faqAnswerHtml(base: string, item: ToolFaqItem): string {
  return item.more ? `${item.a} <a href="${base}${item.more.href}">${item.more.label}</a>` : item.a;
}

function Quote({ quote }: { quote: HnQuote }) {
  const source = HN_SOURCES[quote.source];
  return (
    <>
      <q>{quote.text}</q> (<a href={source.url}>{source.name}</a>)
    </>
  );
}

const prose =
  "space-y-5 leading-relaxed [&_h2]:mt-14 [&_h2]:scroll-mt-20 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_p]:text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-foreground";

const LINK = "font-medium text-foreground underline underline-offset-4";

export default async function ShowHnTitleCheckerPage() {
  const base = siteUrl();
  const url = `${base}${tool.path}`;
  const promo = await isLaunchPromoOn();
  const rules = SHOW_HN_RULES.filter((r) => r.kind === "rule");
  const tips = SHOW_HN_RULES.filter((r) => r.kind === "tip");
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              "@id": `${url}#app`,
              name: "Show HN Title Checker",
              url,
              description: tool.description,
              image: `${url}/opengraph-image`,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              browserRequirements: "Requires JavaScript",
              inLanguage: "en-GB",
              isAccessibleForFree: true,
              featureList: [
                `Checks a Show HN title against ${rules.filter((r) => r.field !== "comment").length} written Hacker News rules`,
                "Checks your text or first comment for asking for votes, sign-up barriers and uppercase emphasis",
                "Each check quotes the exact Hacker News sentence it enforces, with a link",
                "Plain character count, with no invented length limit",
                "Runs in the browser, with no AI and no sign-up",
              ],
              offers: { "@type": "Offer", price: "0", priceCurrency: "GBP", availability: "https://schema.org/InStock" },
              publisher: { "@id": `${base}/#organization`, "@type": "Organization", name: SITE.name, url: `${base}/` },
            },
            faqPage(
              `${url}#faq`,
              SHOW_HN_FAQ.map((item) => ({ q: item.q, a: faqAnswerHtml(base, item) })),
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
        <span aria-current="page">Show HN title checker</span>
      </nav>

      <header className="mt-4 max-w-3xl space-y-4">
        <Badge variant="outline" className="bg-background px-3 py-1 text-xs">Free · No sign-up · No AI</Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{tool.title}</h1>
        <p className="text-pretty text-lg text-muted-foreground" data-testid="showhn-intro">
          Paste your Show HN title, and your text if you have it. Each check tells you whether it meets one of Hacker News&apos;s written rules, and quotes the HN sentence it
          comes from, so you can read the rule yourself. It runs in your browser and nothing you type is sent to us.
        </p>
        <p className="text-pretty text-sm text-muted-foreground" data-testid="showhn-original">
          <strong className="text-foreground">What&apos;s different here:</strong> every check is tied to the exact sentence it enforces, quoted from{" "}
          <a href={HN_SOURCES.showhn.url} className={LINK}>HN&apos;s own pages</a>. Our tests compare every quote, word for word, with copies of those pages fetched on{" "}
          {FETCHED}, and run every before and after example on this page through the same checks. Checks that are only our own advice are labelled as tips.
        </p>
      </header>

      <section aria-label="Show HN title checker" className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-lg shadow-primary/5 sm:p-6">
        <ShowHnChecker />
        <noscript>
          <p className="mt-4 text-sm text-muted-foreground">
            The live checker needs JavaScript. The rules below cover everything it checks, each with the Hacker News sentence it comes from.
          </p>
        </noscript>
      </section>

      <div className={`mt-6 max-w-3xl ${prose}`}>
        <h2 id="rules">The HN rules it checks</h2>
        <p>
          Each rule below is a sentence from the <a href={HN_SOURCES.showhn.url}>Show HN guidelines</a>, the <a href={HN_SOURCES.guidelines.url}>Hacker News guidelines</a>{" "}
          or the <a href={HN_SOURCES.faq.url}>Hacker News FAQ</a>. The rule is HN&apos;s. How we spot it, such as which words count as hype, is ours, and it&apos;s written
          next to each one.
        </p>
      </div>
      <ol className="mt-5 grid max-w-3xl gap-3" data-testid="showhn-rules">
        {rules.map((r) => (
          <li key={r.id} id={`rule-${r.id}`} data-rule={r.id} className="rounded-xl border border-border bg-card p-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium">{r.name}</span>
              <span className="rounded-full border border-border px-1.5 py-px text-[0.6875rem] font-medium uppercase tracking-wide">HN rule</span>
              <span className="text-xs text-muted-foreground">{FIELD_LABEL[r.field]}</span>
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {r.quotes.map((quote) => (
                <li key={quote.text} className="break-words [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4">
                  <Quote quote={quote} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">How it&apos;s checked:</span> {r.how}</p>
          </li>
        ))}
      </ol>

      <div className={`max-w-3xl ${prose}`}>
        <h2 id="tips">Tips that aren&apos;t HN rules</h2>
        <p>These checks are our own advice, not HN rules. The checker labels them as tips, and they never count against the HN rules in the verdict.</p>
        <ul data-testid="showhn-tips">
          {tips.map((r) => (
            <li key={r.id} id={`tip-${r.id}`}>
              <strong>{r.name}.</strong> {r.how}
              {r.quotes.length ? (
                <>
                  {" "}The HN sentence behind it: <Quote quote={r.quotes[0]} />
                </>
              ) : null}
            </li>
          ))}
        </ul>

        <h2 id="not-checked">What no checker can judge</h2>
        <p>Some Show HN rules are about the project, not the words. Read these yourself before you post:</p>
        <ul data-testid="showhn-not-checked">
          {NOT_CHECKED.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong> <Quote quote={item.quote} />
            </li>
          ))}
        </ul>
        <p>
          The HN guidelines also say, for submissions: <Quote quote={HN_QUOTES.generatedPosts} /> So the checker never rewrites your text, and LaunchLoop doesn&apos;t write
          Show HN posts.
        </p>

        <h2 id="examples">Before and after</h2>
        <p>
          These are made-up products. Each &ldquo;before&rdquo; fails exactly the checks listed, and each &ldquo;after&rdquo; passes every check. Our test suite runs all of
          them through the checker above, so if a check changes, the examples have to change with it.
        </p>
      </div>
      <ul className="mt-5 grid max-w-3xl gap-3" data-testid="showhn-examples">
        {SHOW_HN_EXAMPLES.map((ex) => (
          <li key={ex.before.title + (ex.before.comment ?? "")} className="rounded-xl border border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-destructive">Before</p>
                <p className="mt-1 break-words text-muted-foreground">{ex.before.title}</p>
                {ex.before.comment ? <p className="mt-1 break-words text-xs text-muted-foreground">Text: {ex.before.comment}</p> : null}
              </div>
              <div className="min-w-0 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">After</p>
                <p className="mt-1 break-words font-medium">{ex.after.title}</p>
                {ex.after.comment ? <p className="mt-1 break-words text-xs text-muted-foreground">Text: {ex.after.comment}</p> : null}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {ex.link === "video" ? "The link is a video. " : ex.link === "pdf" ? "The link is a PDF. " : ""}
              Fixes:{" "}
              {ex.fixes.map((id, i) => (
                <span key={id}>
                  {i > 0 ? ", " : ""}
                  <a href={`#rule-${id}`} className={LINK}>{RULE_BY_ID[id].name}</a>
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>

      <div className={`max-w-3xl ${prose}`}>
        <h2 id="length">Is there a title length limit?</h2>
        <p>
          Not one HN states. The Show HN guidelines, the main guidelines and the FAQ don&apos;t give a title length, and the{" "}
          <a href="https://news.ycombinator.com/submit">submit form</a> shows only a login when you&apos;re signed out, so we couldn&apos;t read one there either. The checker
          shows a plain character count and doesn&apos;t pass or fail it. A title that says what the project is in one short line is the safe target.
        </p>

        <h2 id="after-the-title">After the title</h2>
        <p>
          The title gets the click. The text decides the thread. <Link href="/how-to-write-a-show-hn-post">How to write a Show HN post</Link> covers the title format, link or
          text post, what to put in your text and how to reply to comments, quoting HN and its moderators throughout. The{" "}
          <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link> covers whether your project qualifies, getting it ready for a spike, timing and what to do
          afterwards.
        </p>
        <p>
          Launching on Product Hunt the same week? Check your 60-character tagline with the <Link href={TAGLINE_CHECKER.path}>Product Hunt tagline checker</Link>. HN shows
          a plain text link, but readers share the good ones on X and Slack, so test your share card with the <Link href={OG_PREVIEW.path}>OG image preview</Link>.
        </p>

        <h2 id="faq">Show HN title FAQ</h2>
        <div className="space-y-8">
          {SHOW_HN_FAQ.map((item) => (
            <section key={item.q}>
              <h3>{item.q}</h3>
              <p className="mt-2">
                {item.a}
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

        <h2 id="sources">Sources</h2>
        <p>Every quote on this page was copied from these Hacker News pages as fetched on {FETCHED}. HN can change them without notice, so check the links before you post.</p>
        <ul>
          <li><a href={HN_SOURCES.showhn.url}>Show HN guidelines</a>, Hacker News</li>
          <li><a href={HN_SOURCES.guidelines.url}>Hacker News guidelines</a></li>
          <li><a href={HN_SOURCES.faq.url}>Hacker News FAQ</a></li>
        </ul>
      </div>

      <aside className="mt-16 flex flex-col items-start gap-4 rounded-3xl bg-foreground px-6 py-10 text-background sm:px-10">
        <h2 className="max-w-xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Your Show HN is yours to write. The rest of your launch doesn&apos;t have to be.</h2>
        <p className="max-w-xl text-background/75">
          Paste your repo and {SITE.name} drafts your landing copy, Product Hunt post, X thread, LinkedIn post and launch images, all inside each platform&apos;s limits, so you
          can spend launch day in the HN thread. The preview is free; the full kit is <KitPrice promo={promo} />.
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
