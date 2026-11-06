export type NewsletterIssue = {
  number: number;
  /** The email's subject line, shown as the page's h1. */
  subject: string;
  /** Meta title, before the " · LaunchLoop" suffix, when the subject is too long for one. */
  metaTitle: string;
  /** The email's preview text: the page's lede and meta description. */
  preview: string;
  /** The day the issue was locked for sending (YYYY-MM-DD), shown as the sample's date. */
  published: string;
  updated: string;
};

/** Public samples of the newsletter, newest first. Each body is its own page under src/app/newsletter/<number>. */
export const NEWSLETTER_ISSUES: NewsletterIssue[] = [
  {
    number: 1,
    subject: "Before you submit to BetaList, check these 5 things",
    metaTitle: "Before you submit to BetaList: 5 checks",
    preview: "What BetaList's own pages say about getting listed, what makers got from it, and the image size for your share card.",
    published: "2026-10-27",
    updated: "2026-10-27",
  },
];

export const NEWSLETTER_PATH = "/newsletter";

export const issuePath = (issue: Pick<NewsletterIssue, "number">) => `${NEWSLETTER_PATH}/${issue.number}`;

export const newsletterIssue = (number: number) => NEWSLETTER_ISSUES.find((issue) => issue.number === number)!;
