import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PackOffer } from "@/components/directory-pack/pack-offer";
import { JsonLd } from "@/components/json-ld";
import { redisDirectoryCount } from "@/lib/directories";
import { siteUrl } from "@/lib/env";
import { PAGES } from "@/lib/pages";
import { directoryPackOffer } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

const page = PAGES.directoryPack;

export const metadata: Metadata = pageMetadata(page);

const NEUTRAL_SIZE = "A researched database of startup directories";

/** The real count only when Redis has the full list at request time, so the build never reads Redis. */
async function PackSize() {
  await connection();
  const count = await redisDirectoryCount();
  return count ? `${count} researched startup directories` : NEUTRAL_SIZE;
}

const link = "font-medium text-foreground underline underline-offset-4 hover:decoration-2";

export default function DirectoryPackPage() {
  const base = siteUrl();
  const offer = directoryPackOffer();
  const inside = [
    { key: "size", title: <Suspense fallback={NEUTRAL_SIZE}><PackSize /></Suspense>, detail: "Launch boards, communities, alternatives catalogues, review sites and evergreen directories, ranked for a solo founder." },
    { key: "pricing", title: "Free, freemium or paid", detail: "Which route each one has, and the cheapest way to get listed where it's known." },
    { key: "badges", title: "Badge and backlink rules", detail: "Whether the free route needs a badge or a link back, whether the link is followed, and Domain Rating (DR) with its source." },
    { key: "notes", title: "Approval time and notes", detail: "Queues, the account you need, gotchas, and what happened when we submitted ourselves." },
    { key: "links", title: "Submit links and UTM links", detail: "Each directory's submit page, and your own URL tagged with utm_source for that directory and utm_medium=directory, so you can see which listings send visits." },
    { key: "copy", title: "Listing copy for each directory", detail: "Enter your product once and get a tagline and description that fit each directory's limits." },
    { key: "csv", title: "CSV download", detail: "The whole database, with your links and copy, for your own spreadsheet." },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [breadcrumbs(base, [{ name: "Directory Launch Pack", path: page.path }])] }} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">Directory Launch Pack</span>
      </nav>
      <header className="mt-4 max-w-3xl space-y-4">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">Directory Launch Pack</h1>
        <p className="text-lg text-muted-foreground">
          The researched list of startup directories we use for our own submissions, with the rules for each one and listing copy written for your product. No guessing which sites are worth a form.
        </p>
      </header>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="lg:sticky lg:top-20 lg:order-last">
          <PackOffer offer={offer} source="directory_pack_page" />
        </div>
        <div className="space-y-8">
          <section aria-labelledby="inside">
            <h2 id="inside" className="text-2xl font-semibold tracking-tight">What&apos;s inside</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {inside.map((item) => (
                <li key={item.key} className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
          <p className="text-muted-foreground">
            Want to start with the free part? <Link href={PAGES.freeDirectories.path} className={link}>Free startup directories</Link> lists our top 20 with queues, badge rules and the date we last checked.
          </p>
        </div>
      </div>
    </div>
  );
}
