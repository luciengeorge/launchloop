import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { ScrollTable } from "@/components/scroll-table";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { PRODUCTS } from "@/lib/products";
import { blogPageMetadata } from "@/lib/seo";
import { OG_PREVIEW, TAGLINE_CHECKER } from "@/lib/tools";

const p = post("product-hunt-vs-betalist");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const SRC = {
  phHowItWorks: "https://www.producthunt.com/launch/how-product-hunt-works",
  phPreparing: "https://www.producthunt.com/launch/preparing-for-launch",
  phBuildPage: "https://help.producthunt.com/en/articles/17834537-4-build-your-product-page",
  phLaunchGuide: "https://help.producthunt.com/en/collections/19793093-launch-guide",
  phUnreleased: "https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product",
  phUpvotes: "https://help.producthunt.com/en/articles/484935-can-i-ask-my-community-friends-family-to-upvote-a-product",
  blHelp: "https://betalist.com/help",
  blCriteria: "https://betalist.com/criteria",
  blAgent: "https://betalist.com/agent",
  blBoost: "https://betalist.com/boost",
  blSubmit: "https://betalist.com/submissions/new",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "Is Product Hunt free to launch on?",
    a: "Yes, to post a product. Product Hunt's How Product Hunt works page says launching costs nothing, and that you can submit a product, comment, and reach Product of the Day without spending a cent.",
  },
  {
    q: "Is BetaList free?",
    a: "No. BetaList's Help page says all submissions are paid and there is no free submission option. Current plans and prices are shown at the end of the submission form. If your startup isn't selected, you get a full refund automatically.",
  },
  {
    q: "Can I submit a waitlist-only page to both?",
    a: "BetaList's criteria aim for a pre-launch landing page with a waitlist, or a beta, or a live product that is still new to its readers. Product Hunt's unreleased-product help page says products that only offer an email sign-up are not eligible for the homepage, and that it prioritises fully launched products people can try immediately.",
  },
  {
    q: "Product Hunt or BetaList: which first?",
    a: "Pick BetaList first when you still have a waitlist or a private beta and you can pay for an editorial review (refunded if it is not selected). Pick Product Hunt first when people can try the product, you can be present for a 24-hour launch day, and you want a free scheduled listing. Many teams do BetaList earlier, then Product Hunt on a later day.",
  },
];

export default function ProductHuntVsBetalistPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        Product Hunt and BetaList are both places to put a new product in front of early adopters, but they charge differently and they accept different stages. This page is a
        head-to-head from each site&apos;s own pages, re-read on 18 November 2026, with every claim next to its quote and link. LaunchLoop is ours; we are not affiliated with
        either board. We have not submitted LaunchLoop to Product Hunt or to BetaList, so this page does not describe a first-hand listing on either one. For the how-tos, see{" "}
        <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link> and{" "}
        <Link href={postPath({ slug: "how-to-launch-on-betalist" })}>how to launch on BetaList</Link>. For the wider list of boards, see{" "}
        <Link href={postPath({ slug: "product-hunt-alternatives" })}>Product Hunt alternatives</Link>.
      </p>

      <h2 id="short-answer">Short answer</h2>
      <p>
        Choose <strong>BetaList</strong> if visitors can only join a waitlist or a closed beta, you want an editorially featured listing, and you can pay (with an automatic
        refund if it is not selected). Choose <strong>Product Hunt</strong> if people can try the product today, you can be around for a scheduled 24-hour launch day, and you
        want a free listing. Do not treat Product Hunt as a vote contest: it bans asking for upvotes. A waitlist-only page is a poor fit for Product Hunt&apos;s homepage.
      </p>

      <h2 id="read-log">Dated read log (18 November 2026)</h2>
      <p>
        Original element: a dated read of both sites on the same day. We fetched Product Hunt&apos;s How Product Hunt works and Build your product page (Preparing for launch),
        plus the unreleased-product and friends-and-family upvote help articles, and BetaList Help, criteria, Boost, Agent API and the public submit form. Where a figure or URL
        has moved since our 9 November posts, this page uses the 18 November wording.
      </p>
      <ul>
        <li>
          <strong>Product Hunt is still free to launch.</strong> How Product Hunt works, 18 November 2026: <q>Launching costs nothing.</q> The same page also says{" "}
          <q>You can submit a product, comment, and reach Product of the Day without spending a cent.</q>
        </li>
        <li>
          <strong>Product Hunt listing fields.</strong> Build your product page, the same day: <q>Name (up to 40 characters)</q>, <q>Tagline (up to 60 characters)</q> and{" "}
          <q>Description (up to 500 characters)</q>. The maker comment box is described as: <q>You have up to 5,000 characters</q>.
        </li>
        <li>
          <strong>Product Hunt launch day.</strong> How Product Hunt works: <q>Every launch goes live at 12:01 AM Pacific Time on the day you schedule.</q> Build your product
          page: <q>When you schedule, pick a date up to 30 days ahead.</q>
        </li>
        <li>
          <strong>Waitlists on Product Hunt.</strong> Can I submit an unreleased product?, re-read the same day: <q>We prioritize fully launched products that users can explore and engage with immediately.</q>{" "}
          And: <q>Products that only offer an email sign-up are not eligible for the homepage.</q>
        </li>
        <li>
          <strong>BetaList is still paid, with a refund if declined.</strong> Help, 18 November 2026: <q>All submissions are paid. There is no free submission option.</q>{" "}
          <q>Current plans and prices are shown at the end of the submission form.</q> <q>If your startup isn&apos;t selected, you get a full refund automatically.</q> The public <a href={SRC.blSubmit}>BetaList submit form</a> still asked only for a website URL and email; it did not show plan prices until after that step, so this page does
          not state submission-plan prices.
        </li>
        <li>
          <strong>BetaList timelines and Boost.</strong> The Agent API page still listed Lite featured within about 14 days, Standard within about 3 days and Premium within about
          1 day, and said not to promise a date because declined submissions are refunded. The Boost page listed Weekly at <q>$99/week</q> and Monthly at <q>$199/month</q>.
        </li>
      </ul>

      <h2 id="compared">Side by side</h2>
      <ScrollTable label="Product Hunt versus BetaList" caption="Product Hunt and BetaList rules and costs from each site's pages on 18 November 2026" hintTestId="ph-vs-betalist-scroll-hint">
        <thead>
          <tr className="border-b border-border text-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">Topic</th>
            <th scope="col" className="py-2 pr-4 font-medium">Product Hunt</th>
            <th scope="col" className="py-2 font-medium">BetaList</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">What it is</th>
            <td className="py-2 pr-4 align-top">A scheduled 24-hour launch day with upvotes, comments and a homepage leaderboard</td>
            <td className="py-2 align-top">An editorially featured listing; criteria say they feature around 20 new startups every day</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Waitlist-only page</th>
            <td className="py-2 pr-4 align-top">Not eligible for the homepage if it only offers an email sign-up</td>
            <td className="py-2 align-top">Yes: criteria aim for <q>A pre-launch landing page with a waitlist.</q></td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Fee to list</th>
            <td className="py-2 pr-4 align-top"><q>Launching costs nothing.</q></td>
            <td className="py-2 align-top">All submissions are paid; prices only on the form; full refund if not selected</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">When it goes live</th>
            <td className="py-2 pr-4 align-top">12:01 AM Pacific on a date you pick, up to 30 days ahead</td>
            <td className="py-2 align-top">After review, on the timeline for the plan you paid for (about 14, 3 or 1 day)</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Site and domain</th>
            <td className="py-2 pr-4 align-top">Homepage, app store page or GitHub repo; skip link shorteners</td>
            <td className="py-2 align-top">Criteria: a distinct landing page; free hosting subdomains and direct app-store links are rejected</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 pr-4 align-top font-normal">After the feature</th>
            <td className="py-2 pr-4 align-top">The launch stays on a permanent Product Page; featuring on the daily leaderboard is editorial and not guaranteed</td>
            <td className="py-2 align-top">A permanent listing and a do-follow backlink if featured; up to two features (pre-launch, then launch)</td>
          </tr>
        </tbody>
      </ScrollTable>

      <h2 id="detail-product-hunt">Product Hunt, in its words</h2>
      <p>
        How Product Hunt works describes a community where makers share what they have built and people come to discover what is new. Anyone with a personal account can submit
        a product. Company and brand accounts cannot: the same page says <q>Company and brand accounts can&apos;t submit launches or comment.</q> The team reviews every launch
        and hand-picks which ones to feature on the homepage leaderboard, and it says featuring is an editorial decision: meeting the guidelines does not guarantee a spot.
      </p>
      <p>
        Build your product page (also published as <a href={SRC.phBuildPage}>4. Build your product page</a> in the{" "}
        <a href={SRC.phLaunchGuide}>Launch Guide</a>) walks through the listing fields, required logo and gallery image, and the maker comment. Check a draft tagline in our{" "}
        <Link href={TAGLINE_CHECKER.path}>Product Hunt tagline checker</Link> and preview a share image in the <Link href={OG_PREVIEW.path}>OG image preview</Link> before you
        schedule. Asking for upvotes is banned: <a href={SRC.phUpvotes}>Can I ask my community/friends/family to upvote a product?</a> says{" "}
        <q>Please don&apos;t. People should upvote things they genuinely like or find interesting, not because they were peer pressured to do so.</q>
      </p>
      <p>
        Step-by-step launch-day work is in <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link> and the{" "}
        <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link>. For Product Hunt versus Show HN, see{" "}
        <Link href={postPath({ slug: "product-hunt-vs-show-hn" })}>Product Hunt or Show HN</Link>.
      </p>

      <h2 id="detail-betalist">BetaList, in its words</h2>
      <p>
        Help describes BetaList as a place for early adopters to discover new internet startups (pre-launch, in beta, or already live) and for founders to get early users and
        feedback. Criteria, re-read on 18 November 2026: <q>We feature around 20 new startups every day.</q> They also say{" "}
        <q>Each startup gets up to two opportunities to be featured: once pre-launch and once at launch.</q> Help says all plans include a do-follow backlink if featured, and a
        full refund if not selected. Faster plans can also guarantee a newsletter slot; Help gives the subscriber figure on that page, which we have not independently counted, so
        this page does not repeat it.
      </p>
      <p>
        Criteria reject free hosting subdomains such as vercel.app, netlify.app or herokuapp.com, and they reject a direct app-store link in place of a landing page. Visitors
        need a way to sign up or get access. Boost, after you are featured, is a separate paid placement: Weekly <q>$99/week</q> or Monthly <q>$199/month</q> on 18 November 2026.
        Submission steps are in <Link href={postPath({ slug: "how-to-launch-on-betalist" })}>how to launch on BetaList</Link>. For BetaList versus Uneed, see{" "}
        <Link href={postPath({ slug: "betalist-vs-uneed" })}>BetaList or Uneed</Link>.
      </p>

      <h2 id="when-which">When to pick which</h2>
      <ul>
        <li>
          <strong>BetaList first</strong> if the product is still a waitlist or a private beta, you have your own domain, and you can pay for a reviewed feature. That is the
          stretch Product Hunt&apos;s homepage rules are written against.
        </li>
        <li>
          <strong>Product Hunt first</strong> if people can try the product, you can show up for the 24-hour window from 12:01 AM Pacific, and you want a free launch day with a
          gallery and a maker comment.
        </li>
        <li>
          <strong>Both, on different days</strong> is a common path: a BetaList pre-launch listing, then a Product Hunt day once the product is tryable. Criteria ask for a gap
          of at least a few weeks between BetaList&apos;s own pre-launch and launch features; Product Hunt is a separate site, but the same idea applies: do not treat them as
          one morning&apos;s work.
        </li>
        <li>
          <strong>Neither of these two</strong> if you only want a free directory listing right now. Start with our{" "}
          <Link href="/free-startup-directories">free startup directories</Link>. The <Link href="/directory-pack">Directory Launch Pack</Link> is{" "}
          {PRODUCTS.directoryPack.priceLabel} once, for a longer researched list with submit links and rules.
        </li>
      </ul>

      <h2 id="next">Next steps</h2>
      <p>
        Open the live criteria, help and submit pages below before you pay or schedule. Draft the listing in your own words. For Product Hunt, check the tagline and the share
        image with the free tools above. LaunchLoop drafts Product Hunt copy and images from a repo, and listing copy you can adapt for a board like BetaList; it does not submit
        to either site. Start with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="Product Hunt or BetaList: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of November 2026. Every Product Hunt and BetaList quote on this page was read on the linked pages on 18 November 2026. Prices, queues and field limits move;
        confirm on the live form before you pay or post. The older Launch Guide article at help.producthunt.com/en/articles/17350772-launch-guide returned HTTP 404 on that day;
        the current guide is the collection and the Build your product page article linked above.
      </p>
      <ul>
        <li><a href={SRC.phHowItWorks}>Product Hunt: How Product Hunt works</a></li>
        <li><a href={SRC.phPreparing}>Product Hunt: Preparing for launch (Build your product page)</a></li>
        <li><a href={SRC.phBuildPage}>Product Hunt: 4. Build your product page</a></li>
        <li><a href={SRC.phLaunchGuide}>Product Hunt Launch Guide</a></li>
        <li><a href={SRC.phUnreleased}>Product Hunt: Can I submit an unreleased product?</a></li>
        <li><a href={SRC.phUpvotes}>Product Hunt: Can I ask my community/friends/family to upvote a product?</a></li>
        <li><a href={SRC.blHelp}>BetaList Help</a></li>
        <li><a href={SRC.blCriteria}>BetaList submission criteria</a></li>
        <li><a href={SRC.blAgent}>BetaList Agent API</a></li>
        <li><a href={SRC.blBoost}>BetaList Boost</a></li>
        <li><a href={SRC.blSubmit}>BetaList submit</a></li>
      </ul>
    </BlogPostLayout>
  );
}
