import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { ScrollTable } from "@/components/scroll-table";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";

const p = post("betalist-vs-uneed");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const BL = "https://betalist.com";
const SRC = {
  blHelp: `${BL}/help`,
  blCriteria: `${BL}/criteria`,
  blAgent: `${BL}/agent`,
  blBoost: `${BL}/boost`,
  blSubmit: `${BL}/submissions/new`,
  uneedHow: "https://www.uneed.best/how-it-works",
  uneedPricing: "https://www.uneed.best/pricing",
  uneedAccept: "https://help.uneed.best/common-questions-and-issues/what-we-accept",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "Is BetaList free?",
    a: "No. BetaList's Help page says all submissions are paid and there is no free submission option. If your startup isn't selected, you get a full refund automatically. Current plans and prices are shown at the end of the submission form.",
  },
  {
    q: "Is Uneed free?",
    a: "Uneed has a free waiting line. On 9 November 2026 its How it works page said the free line assigns a launch date at least 50 days out. Paid options were Fast-track at $14.99 and Skip the waiting line at $39.99, with Relaunch at $15.",
  },
  {
    q: "Can I submit a waitlist to both?",
    a: "BetaList's criteria welcome a pre-launch landing page with a waitlist. Uneed's help page says it declines closed, invite-only or gated products, including waitlists, because reviewers need to try the product.",
  },
  {
    q: "BetaList or Uneed for an indie app?",
    a: "Pick BetaList when the product is still a waitlist or early beta and you can pay for a reviewed feature. Pick Uneed when the product is tryable, you can wait in the free line or pay to pick a date, and you want a launch-day upvote board.",
  },
];

export default function BetalistVsUneedPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        BetaList and Uneed both list new products, but they fit different stages. This page is a head-to-head from each site&apos;s own pages, re-read on 9 November 2026, with every
        claim next to its quote and link. LaunchLoop is ours; we are not affiliated with either board. For the wider list of boards, see{" "}
        <Link href={postPath({ slug: "product-hunt-alternatives" })}>Product Hunt alternatives</Link>. Peerlist, DevHunt and Microlaunch are summarised there.
      </p>

      <h2 id="short-answer">Short answer</h2>
      <p>
        Choose <strong>BetaList</strong> if visitors can only sign up and you need an editorially featured listing (paid; refunded if not selected). Choose <strong>Uneed</strong> if
        reviewers can try the product and you want a free queue (long) or a paid date. Do not submit a waitlist-only page to Uneed.
      </p>

      <h2 id="read-log">Dated read log (9 November 2026)</h2>
      <p>
        Original element: a dated read of both sites the same day. We fetched BetaList Help, criteria, Boost and Agent API pages, and Uneed How it works, Pricing and What we accept.
        Where a figure moved since our October posts, this page uses the November wording.
      </p>
      <ul>
        <li>
          <strong>Uneed free wait.</strong> How it works on 9 November 2026: <q>Join the free waiting line (free): we assign your launch date automatically, at least 50 days out, on
          the earliest day with room.</q> Our October alternatives post still said at least 30 days out from an earlier read. Use 50 days until Uneed changes it again.
        </li>
        <li>
          <strong>Uneed paid launches.</strong> Same page: Fast-track <q>$14.99</q> (about two weeks), Skip the waiting line <q>$39.99</q>, Relaunch <q>$15</q> on Pricing. Pricing also
          showed Skip the line at <q>$39.99</q> and Fast-track at <q>$14.99</q>.
        </li>
        <li>
          <strong>BetaList payment.</strong> Help: <q>All submissions are paid. There is no free submission option.</q> And: <q>Current plans and prices are shown at the end of the
          submission form.</q> Refund: <q>If your startup isn&apos;t selected, you get a full refund automatically.</q>
        </li>
        <li>
          <strong>BetaList timelines.</strong> Agent API page: Lite featured within about 14 days, Standard within about 3 days, Premium within about 1 day. It also says not to promise
          a date because declined submissions are refunded.
        </li>
      </ul>

      <h2 id="compared">Side by side</h2>
      <ScrollTable label="BetaList versus Uneed" caption="BetaList and Uneed rules and costs from each site's pages on 9 November 2026" hintTestId="betalist-uneed-scroll-hint">
        <thead>
          <tr className="border-b border-border text-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">Topic</th>
            <th scope="col" className="py-2 pr-4 font-medium">BetaList</th>
            <th scope="col" className="py-2 font-medium">Uneed</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Who it is for</th>
            <td className="py-2 pr-4 align-top">Early adopters discovering startups that are new to them; waitlist, beta or recently live</td>
            <td className="py-2 align-top">Daily launches of tryable products, with upvote rankings</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Waitlist OK?</th>
            <td className="py-2 pr-4 align-top">Yes: criteria aim for a pre-launch landing page with a waitlist</td>
            <td className="py-2 align-top">No: <q>Closed, invite-only or gated products</q> are declined; waitlists are called out</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Free route</th>
            <td className="py-2 pr-4 align-top">None</td>
            <td className="py-2 align-top">Free waiting line, at least 50 days out</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Paid route</th>
            <td className="py-2 pr-4 align-top">Plans only on the form; Boost after feature $99/week or $199/month</td>
            <td className="py-2 align-top">Fast-track $14.99; Skip $39.99; Relaunch $15</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Backlink notes</th>
            <td className="py-2 pr-4 align-top">Help describes a do-follow backlink if featured</td>
            <td className="py-2 align-top">Free line: score 20+ keeps do-follow; 10 to 19 stays with nofollow; below 10 returns to dashboard</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 pr-4 align-top font-normal">Review</th>
            <td className="py-2 pr-4 align-top">Editorial; paid submissions can still be declined (then refunded)</td>
            <td className="py-2 align-top">Paid Fast-track and Skip are never declined per What we accept; free line is reviewed</td>
          </tr>
        </tbody>
      </ScrollTable>

      <h2 id="detail-betalist">BetaList, in its words</h2>
      <p>
        Help describes BetaList as the place for early adopters to discover new internet startups (pre-launch, in beta, or already live) and for founders to get early users and
        feedback. Criteria: <q>We feature around 20 new startups every day.</q> Boost page listed Weekly <q>$99 /week</q> and Monthly <q>$199 /month</q> on 9 November 2026.
        Step-by-step submission is in <Link href={postPath({ slug: "how-to-launch-on-betalist" })}>how to launch on BetaList</Link>.
      </p>

      <h2 id="detail-uneed">Uneed, in its words</h2>
      <p>
        How it works: every day at 12:00 AM PST, <q>up to 50 free launches from the waiting line, plus every paid launch (Fast-track, Skip the waiting line and relaunches)</q>. What we
        accept wants original, functional products and declines generic AI wrappers, low-effort tools, copycats, spam, NSFW, and gated products. Paid launches:{" "}
        What we accept says submissions from the paid queue are never declined, covering both Fast-track ($14.99) and Skip the Waiting Line ($39.99).
      </p>

      <h2 id="next">Next steps</h2>
      <p>
        If you are still choosing a board, open the criteria and pricing links below before you pay. For Product Hunt or Show HN instead, read{" "}
        <Link href={postPath({ slug: "product-hunt-vs-show-hn" })}>Product Hunt or Show HN</Link>. LaunchLoop drafts listing copy; it does not submit to BetaList or Uneed. Start
        with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="BetaList or Uneed: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of November 2026. Every BetaList and Uneed quote on this page was read on the linked pages on 9 November 2026. Prices and queues move; confirm on the live form before
        you pay.
      </p>
      <ul>
        <li><a href={SRC.blHelp}>BetaList Help</a></li>
        <li><a href={SRC.blCriteria}>BetaList submission criteria</a></li>
        <li><a href={SRC.blAgent}>BetaList Agent API</a></li>
        <li><a href={SRC.blBoost}>BetaList Boost</a></li>
        <li><a href={SRC.blSubmit}>BetaList submit</a></li>
        <li><a href={SRC.uneedHow}>Uneed: How it works</a></li>
        <li><a href={SRC.uneedPricing}>Uneed Pricing</a></li>
        <li><a href={SRC.uneedAccept}>Uneed: What we accept (and what we don&apos;t)</a></li>
      </ul>
    </BlogPostLayout>
  );
}
