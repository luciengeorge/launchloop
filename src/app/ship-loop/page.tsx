import { GitCommitHorizontal, Image as ImageIcon, MailCheck, PenLine } from "lucide-react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { ShipLoopPlans } from "@/components/ship-loop-plans";
import { StartLink } from "@/components/start-link";
import { buttonVariants } from "@/components/ui/button";
import { siteUrl } from "@/lib/env";
import { PAGES } from "@/lib/pages";
import { shipLoopPreorderOpen } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, shipLoopApp } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata(PAGES.shipLoop);

const FLOW = [
  { icon: GitCommitHorizontal, title: "You ship.", body: "Push a release or tag on your default branch, or update your changelog." },
  { icon: PenLine, title: "We draft.", body: "Ship Loop reads the release notes and changes, then writes an X post, a LinkedIn post and a changelog blurb." },
  { icon: ImageIcon, title: "With an image.", body: "Each update gets a fresh image in your brand colours, sized for each platform." },
  { icon: MailCheck, title: "You approve.", body: "One email. Approve it as is or edit it, then post it yourself. Nothing is posted for you." },
];

const COMPARISON = [
  { label: "When", kit: "Launch day", loop: "Every release after" },
  { label: "Price", kit: "£19 once", loop: "£12/month or £99/year from launch" },
  { label: "You get", kit: "A full launch pack for one app", loop: "Draft posts and an image per release" },
  { label: "Status", kit: "Available now", loop: "Coming soon" },
];

export default function ShipLoopPage() {
  const base = siteUrl();
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [shipLoopApp(base), breadcrumbs(base, [{ name: "Ship Loop", path: PAGES.shipLoop.path }])] }} />
      <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:items-start">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Coming soon · Waitlist and pre-orders open</p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">You launched once. Now keep shipping in public.</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Every time you ship a release, Ship Loop drafts an X post, a LinkedIn post, a changelog blurb and an image in your colours. You get one email. You approve or
              edit, then you post.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a href="#plans" className={buttonVariants({ size: "lg", className: "px-5" })}>
                Pre-order Ship Loop
              </a>
              <a href="#waitlist" className={buttonVariants({ variant: "outline", size: "lg", className: "px-5" })}>
                Join the free waitlist
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Founding pre-order: £99 once, covering your first year of Ship Loop once it launches. Refunded in full if Ship Loop isn&apos;t live within 12 months. After that
              first year, Ship Loop is £12/month or £99/year.
            </p>
          </div>
          <h2 className="sr-only">How Ship Loop works</h2>
          <ol className="grid gap-4 sm:grid-cols-2">
            {FLOW.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-2xl border border-border bg-card p-5">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Bought a £19 Launch Kit? Subscribe within 14 days of buying and we credit the full £19.</li>
            <li>• Drafts only. We never post for you or ask anyone for upvotes.</li>
            <li>• Public GitHub repos at launch. Private repos via a GitHub App later.</li>
          </ul>
          <section className="rounded-2xl border border-border bg-muted/40 p-6" aria-labelledby="compare-heading">
            <h2 id="compare-heading" className="text-xl font-semibold tracking-tight">
              Launch Kit or Ship Loop?
            </h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4" />
                  <th scope="col" className="py-2 pr-4 font-medium">Launch Kit</th>
                  <th scope="col" className="py-2 font-medium">Ship Loop</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-2 pr-4 font-medium text-foreground">{row.label}</th>
                    <td className="py-2 pr-4">{row.kit}</td>
                    <td className="py-2">{row.loop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm text-muted-foreground">
              Most people buy the kit to launch, then add Ship Loop. Subscribe within 14 days of buying a kit and we credit the £19.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <StartLink plan="kit" className={buttonVariants({ variant: "outline" })}>
                Get my launch kit, £19
              </StartLink>
              <a href="#plans" className={buttonVariants({ variant: "ghost" })}>
                Pre-order Ship Loop
              </a>
            </div>
          </section>
        </div>
        <ShipLoopPlans preorderOpen={shipLoopPreorderOpen()} />
      </div>
    </div>
  );
}
