import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { NewsletterArchiveSignup } from "@/components/newsletter-archive-signup";
import { IssueOneBody } from "@/components/newsletter-issue-1";
import { BLOG_AUTHOR, longDate } from "@/lib/blog";
import { siteUrl } from "@/lib/env";
import { newsletterReward } from "@/lib/newsletter";
import { isNewsletterCalendarOn } from "@/lib/newsletter-flag-server";
import { newsletterIssue } from "@/lib/newsletter-issues";
import { issuePage, NEWSLETTER_PAGE } from "@/lib/pages";
import { calendarRewardMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { breadcrumbs } from "@/lib/structured-data";

const issue = newsletterIssue(1);
const page = issuePage(issue);

export async function generateMetadata(): Promise<Metadata> {
  return calendarRewardMetadata(page, await isNewsletterCalendarOn());
}

export default async function NewsletterIssueOnePage() {
  const reward = newsletterReward(await isNewsletterCalendarOn());
  const base = siteUrl();
  const url = `${base}${page.path}`;
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${url}#article`,
              headline: issue.subject,
              description: issue.preview,
              url,
              mainEntityOfPage: url,
              image: `${base}${page.image.url}`,
              datePublished: issue.published,
              dateModified: issue.updated,
              inLanguage: "en-GB",
              author: { "@type": "Person", name: BLOG_AUTHOR.name },
              publisher: { "@id": `${base}/#organization`, "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${base}/icons/icon-512.png` } },
            },
            breadcrumbs(base, [
              { name: "Newsletter", path: NEWSLETTER_PAGE.path },
              { name: `Issue ${issue.number}`, path: page.path },
            ]),
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span>{" "}
        <Link href={NEWSLETTER_PAGE.path} className="hover:text-foreground">Newsletter</Link> <span aria-hidden="true">/</span>{" "}
        <span aria-current="page">Issue {issue.number}</span>
      </nav>
      <header className="mt-4 space-y-3">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">{issue.subject}</h1>
        <p className="text-lg text-muted-foreground">{issue.preview}</p>
        <p className="text-xs text-muted-foreground" data-testid="byline">
          Sample issue <span aria-hidden="true">·</span> Lucien <span aria-hidden="true">·</span>{" "}
          <time dateTime={issue.published}>{longDate(issue.published)}</time>
        </p>
      </header>
      <div
        className="mt-10 space-y-5 leading-relaxed [&_h2]:mt-10 [&_h2]:scroll-mt-20 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_p]:text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-foreground"
        data-testid="newsletter-issue-body"
      >
        <IssueOneBody />
      </div>
      <div className="mt-12">
        <NewsletterArchiveSignup variant="issue" reward={reward} returnTo={page.path} />
      </div>
      <p className="mt-8 text-sm">
        <Link href={NEWSLETTER_PAGE.path} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">All sample issues</Link>
      </p>
    </article>
  );
}
