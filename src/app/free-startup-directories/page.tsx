import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PackOffer } from "@/components/directory-pack/pack-offer";
import { JsonLd } from "@/components/json-ld";
import { ScrollTable } from "@/components/scroll-table";
import { BLOG_AUTHOR, longDate } from "@/lib/blog";
import { freeDirectories } from "@/lib/directories";
import { siteUrl } from "@/lib/env";
import { PAGES } from "@/lib/pages";
import { directoryPackOffer } from "@/lib/payments";
import { PRODUCTS } from "@/lib/products";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, faqPage } from "@/lib/structured-data";

const page = PAGES.freeDirectories;

export const metadata: Metadata = pageMetadata(page);

const COLUMNS = ["Directory", "Type", "Free route", "Queue or wait", "Badge or link back", "Link type", "Submit", "Last verified", "Our submission"] as const;

const link = "font-medium text-foreground underline underline-offset-4 hover:decoration-2";

/** `a` is the FAQPage JSON-LD text as the brief gives it; `answer` is the visible answer, which may add a link. */
function faq(offer: { priceLabel: string } | null): { q: string; a: string; answer?: ReactNode }[] {
  const kit = PRODUCTS.kit.priceLabel;
  const pack = offer
    ? `Yes: the Directory Launch Pack is a longer researched list with submit links, rules and a reusable fact sheet, for ${offer.priceLabel} once.`
    : "We are putting together a Directory Launch Pack: a longer researched list with submit links, rules and a reusable fact sheet. It is not on sale yet.";
  return [
    {
      q: "Which startup directories are free in 2026?",
      a: "The table above lists 20 directories that, on the date in the Last verified column, still described a free way to submit on their own pages. Free often still means a queue, a review, or a badge. Check the live submit page before you spend an afternoon on a form, because these rules move.",
    },
    {
      q: "Where should I launch my startup first?",
      a: "Pick the place your users already are, then add one or two evergreen directories. For a consumer or prosumer product, Product Hunt is the usual launch-day board. For a technical product, Show HN. For a founder audience, Indie Hackers. This page is the short free-directory list to work through after those, not a replacement for them.",
      answer: (
        <>
          Pick the place your users already are, then add one or two evergreen directories. For a consumer or prosumer product, Product Hunt is the usual launch-day board. For a technical product, Show HN. For a founder audience, Indie Hackers. This page is the short free-directory list to work through after those, not a replacement for them. See{" "}
          <Link href="/blog/product-hunt-alternatives" className={link}>Product Hunt alternatives</Link> for the launch boards in more detail.
        </>
      ),
    },
    {
      q: "Do free directories give dofollow backlinks?",
      a: "Not always, and not always on the free tier. Some sites want a badge or a link on your site. Some only follow the link if you hit an upvote threshold or finish in the top places that day. This table only states a link type when we have checked a live listing. If the cell says not checked, do not assume dofollow.",
      answer:
        'Not always, and not always on the free tier. Some sites want a badge or a link on your site. Some only follow the link if you hit an upvote threshold or finish in the top places that day. This table only states a link type when we have checked a live listing. If the cell says "not checked", do not assume dofollow.',
    },
    {
      q: "How long do free directory queues take?",
      a: "It depends on the site, and the stated waits change. Some boards let you pick a day. Others assign a slot days or months out, or review submissions by hand with no published wait. Use the Queue or wait column, which quotes the directory's own wording on the last-verified date, and re-read the live page before you plan around it.",
    },
    {
      q: "Should I submit to all 20 directories at once?",
      a: "No. Pick a handful that match your product and finish those properly: a working URL, a clear one-liner, and a follow-up if they accept you. Spreading one afternoon across twenty half-filled forms is how listings get declined or ignored. Our 7-day launch calendar suggests one free directory during launch week, then more after the main launch day.",
      answer: (
        <>
          No. Pick a handful that match your product and finish those properly: a working URL, a clear one-liner, and a follow-up if they accept you. Spreading one afternoon across twenty half-filled forms is how listings get declined or ignored. Our{" "}
          <Link href="/7-day-launch-calendar" className={link}>7-day launch calendar</Link> suggests one free directory during launch week, then more after the main launch day.
        </>
      ),
    },
    {
      q: "What is the difference between a launch board and a startup directory?",
      a: "A launch board (Product Hunt, Show HN, many weekly launchpads) is an event: people show up on a day or a week, vote or comment, and most of the traffic arrives then. A directory or alternatives catalogue is evergreen: people find you later through search or by browsing a category. Many sites mix both. The Type column is there so you can plan for a spike and for a listing that stays up.",
    },
    {
      q: "Is there a paid way to get a longer list?",
      a: `${pack} This top-20 page stays free. The Launch Kit, which drafts your launch copy from a public repo or live URL, is ${kit} once and is on the pricing page today.`,
      answer: (
        <>
          {offer ? (
            <>
              Yes: the <Link href={PAGES.directoryPack.path} className={link}>Directory Launch Pack</Link> is a longer researched list with submit links, rules and a reusable fact sheet, for {offer.priceLabel} once.
            </>
          ) : (
            <>
              We are putting together a <Link href={PAGES.directoryPack.path} className={link}>Directory Launch Pack</Link>: a longer researched list with submit links, rules and a reusable fact sheet. It is not on sale yet.
            </>
          )}{" "}
          This top-20 page stays free. The Launch Kit, which drafts your launch copy from a public repo or live URL, is {kit} once and is on the{" "}
          <Link href="/pricing" className={link}>pricing page</Link> today.
        </>
      ),
    },
  ];
}

export default function FreeStartupDirectoriesPage() {
  const base = siteUrl();
  const rows = freeDirectories();
  const offer = directoryPackOffer();
  const questions = faq(offer);
  const reviewed = rows.map((r) => r.lastVerified).sort().at(-1) ?? page.updated;
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", "@id": `${base}${page.path}#page`, url: `${base}${page.path}`, name: page.title, description: page.description, inLanguage: "en-GB", dateModified: reviewed, isPartOf: { "@id": `${base}/#website` } },
            breadcrumbs(base, [{ name: "Free startup directories", path: page.path }]),
            faqPage(`${base}${page.path}#faq`, questions),
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">Free startup directories</span>
      </nav>

      <article className="mt-4">
        <header className="max-w-3xl space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight">Free startup directories: 20 places to launch a startup in 2026</h1>
          <p className="text-sm text-muted-foreground">
            By {BLOG_AUTHOR.name} · Updated <time dateTime={reviewed}>{longDate(reviewed)}</time>
          </p>
          <div className="space-y-4 text-lg text-muted-foreground">
            <p>If you have just shipped a product and are wondering where to list it, start with a short list you can actually finish. This page is a free top-20 of startup directories and launch boards that still have a free way to submit in 2026. It is not a dump of every site that will take a URL.</p>
            <p>For each row we record what the directory&apos;s own pages say about the free route, the queue, any badge or link-back rule, and the date we last checked. Where we have submitted LaunchLoop ourselves, we say so. We do not invent traffic numbers or backlink claims.</p>
            <p>Pick a handful that match your audience, not all twenty in one afternoon. Launch boards such as Product Hunt or Show HN are a short spike. Evergreen directories are slower, but the listing can stay up.</p>
            <p>
              If you want the longer list we use internally, with submit links and a reusable fact sheet, that is the <Link href={PAGES.directoryPack.path} className={link}>Directory Launch Pack</Link>
              {offer ? "." : " we are putting together."} This page stays free.
            </p>
          </div>
        </header>

        <section aria-labelledby="directories" className="mt-12 space-y-4">
          <h2 id="directories" className="text-2xl font-semibold tracking-tight">The 20 free directories</h2>
          <p className="text-sm font-medium">Last reviewed: {longDate(reviewed)}</p>
          <ScrollTable label="The 20 free startup directories" caption="Free startup directories, in our recommended order" hintTestId="free-directories-hint" width="wide">
            <thead>
              <tr className="border-b border-border text-foreground">
                {COLUMNS.map((c) => (
                  <th key={c} scope="col" className="py-2 pr-4 align-bottom font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rank} className="border-b border-border/60 align-top">
                  <th scope="row" className="py-3 pr-4 font-normal">
                    <a href={row.url} className={link} rel="noopener">{row.name}</a>
                    <span className="block text-xs">{new URL(row.url).host}</span>
                  </th>
                  <td className="py-3 pr-4">{row.type}</td>
                  <td className="py-3 pr-4">{row.freeRoute}</td>
                  <td className="py-3 pr-4">{row.queue}</td>
                  <td className="py-3 pr-4">{row.badge}</td>
                  <td className="py-3 pr-4">{row.linkType}</td>
                  <td className="py-3 pr-4">
                    <a href={row.submit} className={link} rel="noopener">Submit<span className="sr-only"> to {row.name}</span></a>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap" data-testid="last-verified">{row.lastVerified ? <time dateTime={row.lastVerified}>{row.lastVerified}</time> : "not stated"}</td>
                  <td className="py-3 pr-4" data-testid="our-submission">{row.ourSubmission}</td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
        </section>

        <div className="mt-12 max-w-3xl space-y-12 text-muted-foreground [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_p]:mt-3">
          <section aria-labelledby="how-to-use">
            <h2 id="how-to-use">How to use this list</h2>
            <p>Pick a handful, not all 20. Choose the directories whose audience matches your product: a developer tool belongs on dev communities and launch boards, a consumer app on the general boards. Then finish each form properly, with a working URL, a clear one-liner and a share image that renders (check it with the <Link href="/tools/og-preview" className={link}>OG preview tool</Link> first).</p>
            <p>For the launch boards in depth, read <Link href="/blog/product-hunt-alternatives" className={link}>Product Hunt alternatives</Link>. For when to fit a directory into launch week, see the <Link href="/7-day-launch-calendar" className={link}>7-day launch calendar</Link>.</p>
          </section>

          <section aria-labelledby="free-costs">
            <h2 id="free-costs">What &ldquo;free&rdquo; usually costs</h2>
            <p>Free rarely means instant. Many sites put free listings in a queue or review them by hand, some ask for a badge or a link back to them on your site, and some only keep you listed, or only follow your link, if you reach an upvote threshold. Some free tiers give a nofollow link. The table quotes each site&apos;s own wait and badge rule, so check the row before you plan around it.</p>
          </section>

          <section aria-labelledby="boards-vs-directories">
            <h2 id="boards-vs-directories">Launch boards versus evergreen directories</h2>
            <p>A launch board gives you a spike: a day or a week of attention, then you scroll off the front page. An evergreen directory is slower, but the listing stays up and people find it later through search or a category. Plan for both.</p>
            <p>
              For the event layer, see <Link href="/blog/how-to-launch-on-product-hunt" className={link}>how to launch on Product Hunt</Link> and the <Link href="/product-hunt-launch-checklist" className={link}>Product Hunt launch checklist</Link>, the <Link href="/show-hn-launch-checklist" className={link}>Show HN launch checklist</Link> and <Link href="/how-to-write-a-show-hn-post" className={link}>how to write a Show HN post</Link>, and <Link href="/blog/how-to-launch-on-indie-hackers" className={link}>how to launch on Indie Hackers</Link>.
            </p>
          </section>

          <section aria-labelledby="method">
            <h2 id="method">How we check each row</h2>
            <p>Each row comes from our own research notes and the directory&apos;s own pages. The Last verified date is the day we last loaded the directory&apos;s site and submit page. We only fill Link type from a live listing we have checked, so it says &ldquo;not checked&rdquo; until we have. Our submission is only filled where we have actually submitted LaunchLoop, from our own submission logs.</p>
          </section>

          <section aria-labelledby="pack">
            <h2 id="pack">The longer list (Directory Launch Pack)</h2>
            <p>
              The 20 rows above are the short, free list. The <Link href={PAGES.directoryPack.path} className={link}>Directory Launch Pack</Link> is the longer researched list we already use for our own submissions: more directories, the submit link, the free and paid routes, queue and badge rules, and a fact sheet you can reuse on each form.{" "}
              {offer ? `It is ${offer.priceLabel} once, not a subscription.` : "We are putting that pack together now."}
            </p>
            <p>
              This top-20 page stays free. If you also need launch copy (a Product Hunt post, an X thread, a LinkedIn post and images, drafted from a public GitHub repo or a live URL), the <Link href="/pricing" className={link}>Launch Kit</Link> is {PRODUCTS.kit.priceLabel} once, with a 14-day refund, and you can <Link href="/#start" className={link}>try a free preview</Link> first.
            </p>
            <div className="mt-6 max-w-md">
              <PackOffer offer={offer} source="free_directories_page" />
            </div>
          </section>

          <section aria-labelledby="faq-heading" id="faq" className="scroll-mt-20">
            <h2 id="faq-heading">FAQ</h2>
            <div className="mt-4 space-y-6">
              {questions.map((item) => (
                <div key={item.q}>
                  <h3 className="text-lg font-semibold text-foreground">{item.q}</h3>
                  <p className="!mt-2">{item.answer ?? item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="sources">
            <h2 id="sources">Sources</h2>
            <p>Each directory&apos;s own site and submit page, linked in the table and loaded on the Last verified date. Our submission notes come from LaunchLoop&apos;s own submission logs.</p>
          </section>

          <section aria-label="Related guides">
            <p>
              Related guides: <Link href="/blog/product-hunt-alternatives" className={link}>Product Hunt alternatives</Link>, <Link href="/blog/how-to-launch-on-betalist" className={link}>how to launch on BetaList</Link>, <Link href="/blog/betalist-vs-uneed" className={link}>BetaList vs Uneed</Link>, <Link href="/how-to-promote-on-reddit" className={link}>how to promote on Reddit</Link> and the <Link href="/7-day-launch-calendar" className={link}>7-day launch calendar</Link>.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
