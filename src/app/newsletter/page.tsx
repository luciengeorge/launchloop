import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { NewsletterArchiveSignup } from "@/components/newsletter-archive-signup";
import { longDate } from "@/lib/blog";
import { siteUrl } from "@/lib/env";
import { newsletterReward } from "@/lib/newsletter";
import { isNewsletterCalendarOn } from "@/lib/newsletter-flag-server";
import { issuePath, NEWSLETTER_ISSUES } from "@/lib/newsletter-issues";
import { NEWSLETTER_PAGE } from "@/lib/pages";
import { calendarRewardMetadata } from "@/lib/seo";
import { breadcrumbs, collectionPage } from "@/lib/structured-data";

const HEADING = "Weekly launch teardowns";

export async function generateMetadata(): Promise<Metadata> {
  return calendarRewardMetadata(NEWSLETTER_PAGE, await isNewsletterCalendarOn());
}

export default async function NewsletterPage() {
  const reward = newsletterReward(await isNewsletterCalendarOn());
  const base = siteUrl();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            collectionPage(
              base,
              { path: NEWSLETTER_PAGE.path, name: HEADING, description: NEWSLETTER_PAGE.description },
              NEWSLETTER_ISSUES.map((issue) => ({ name: issue.subject, path: issuePath(issue) })),
            ),
            breadcrumbs(base, [{ name: "Newsletter", path: NEWSLETTER_PAGE.path }]),
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">Newsletter</span>
      </nav>
      <header className="mt-4 space-y-3">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">{HEADING}</h1>
        <p className="text-lg text-muted-foreground">
          One launch teardown a week, by email: a real launch, what worked, what didn&apos;t and what you can copy. Short and practical.
        </p>
      </header>
      <div className="mt-8">
        <NewsletterArchiveSignup variant="index" reward={reward} returnTo={NEWSLETTER_PAGE.path} />
      </div>
      <section className="mt-12" aria-labelledby="issues-heading">
        <h2 id="issues-heading" className="text-xl font-semibold tracking-tight">Sample issues</h2>
        <ul className="mt-4 space-y-4">
          {NEWSLETTER_ISSUES.map((issue) => (
            <li key={issue.number}>
              <article className="relative rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/60">
                <p className="text-xs text-muted-foreground">Issue {issue.number}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">
                  <Link href={issuePath(issue)} className="after:absolute after:inset-0 hover:text-primary">
                    {issue.subject}
                  </Link>
                </h3>
                <p className="mt-2 text-muted-foreground">{issue.preview}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  <time dateTime={issue.published}>{longDate(issue.published)}</time>
                </p>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
