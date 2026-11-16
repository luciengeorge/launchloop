import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CopyButton } from "@/components/copy-button";
import { ListingForm } from "@/components/directory-pack/listing-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listingFor, type ListingCopy } from "@/lib/copy";
import { allDirectories } from "@/lib/directories";
import { submitUrl, utmLink, type Directory } from "@/lib/directory-csv";
import { getPack, type DirectoryPack } from "@/lib/directory-pack";
import { PAGES } from "@/lib/pages";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your Directory Launch Pack",
  robots: { index: false, follow: false },
};

export default function DirectoryPackAccessPage({ params }: PageProps<"/directory-pack/access/[id]">) {
  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] max-w-5xl px-4 py-10 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <PackView params={params} />
      </Suspense>
    </div>
  );
}

async function PackView({ params }: Pick<PageProps<"/directory-pack/access/[id]">, "params">) {
  const pack = await getPack((await params).id);
  if (!pack) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">We couldn&apos;t find a paid pack at this link</h1>
        <p className="text-muted-foreground">
          Check the link in your receipt email. If you paid and it still doesn&apos;t open, email <a href={`mailto:${SITE.email}`} className="underline underline-offset-4">{SITE.email}</a> and we&apos;ll sort it out.
        </p>
        <Link href={PAGES.directoryPack.path} className={buttonVariants({ variant: "outline" })}>About the Directory Launch Pack</Link>
      </div>
    );
  }
  const rows = await allDirectories();
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Your Directory Launch Pack</h1>
        <p className="text-muted-foreground">
          {rows.length} directories, ranked. Keep this link private: anyone with it can open your pack.{pack.email ? " We've emailed it to you too." : ""}
        </p>
        <a href={`/api/directory-pack/${pack.id}/csv`} className={buttonVariants({ variant: "outline" })} download>
          Download the CSV
        </a>
      </header>

      <section aria-labelledby="listing-heading" className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1">
          <h2 id="listing-heading" className="text-xl font-semibold">Your listing copy</h2>
          <p className="text-sm text-muted-foreground">Enter your product once. Each directory gets a tagline and description that fit its limits, and your URL tagged for that directory.</p>
        </div>
        <ListingForm packId={pack.id} initial={pack.product ? { ...pack.product, features: pack.product.features.join("\n") } : undefined} />
      </section>

      <ol className="space-y-4">
        {rows.map((row) => (
          <DirectoryCard key={row.rank} row={row} pack={pack} />
        ))}
      </ol>
    </div>
  );
}

const shown = (value: string | number | null) => (value === null || value === "" ? "not stated" : String(value));

function DirectoryCard({ row, pack }: { row: Directory; pack: DirectoryPack }) {
  const copy: ListingCopy | null = pack.listings ? listingFor(pack.listings, row) : null;
  const facts: [string, string][] = [
    ["Category", row.category],
    ["Pricing", row.pricing],
    ["Cheapest price (USD)", row.price_usd === null ? "not stated" : `$${row.price_usd}`],
    ["Badge required", row.badge_required],
    ["Backlink required", row.backlink_required],
    ["Dofollow", row.dofollow],
    ["DR", shown(row.dr)],
    ["Approval time", shown(row.approval_time)],
    ["Last verified", shown(row.last_verified)],
    ["Our submission", shown(row.our_submission)],
    ...(row.our_submission_detail ? ([["Submission detail", row.our_submission_detail]] as [string, string][]) : []),
    ["Tagline max", shown(row.tagline_max)],
    ["Description max", shown(row.description_max)],
    ["UTM source", row.utm_source],
  ];
  return (
    <li className="rounded-2xl border border-border bg-card p-5" data-testid="directory-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">
          <span className="mr-2 text-muted-foreground">{row.rank}.</span>
          <a href={row.url} className="underline-offset-4 hover:underline" rel="noopener">{row.name}</a>
        </h3>
        <a href={submitUrl(row)} className={buttonVariants({ size: "sm" })} rel="noopener" aria-label={`Submit to ${row.name}`}>
          Submit
        </a>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {row.notes ? <p className="mt-3 text-sm text-muted-foreground">{row.notes}</p> : null}
      {pack.product && copy ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
          <Pasteable label="Your link" value={utmLink(pack.product.url, row)} testId="listing-link" />
          <Pasteable label="Tagline" value={copy.tagline} testId="listing-tagline" />
          <Pasteable label="Description" value={copy.description} testId="listing-description" />
        </div>
      ) : null}
    </li>
  );
}

function Pasteable({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words" data-testid={testId}>{value}</p>
      </div>
      <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} />
    </div>
  );
}
