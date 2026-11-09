import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { ScrollTable } from "@/components/scroll-table";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";
import { SHOW_HN_CHECKER, TAGLINE_CHECKER } from "@/lib/tools";

const p = post("product-hunt-vs-show-hn");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const SRC = {
  showHn: "https://news.ycombinator.com/showhn.html",
  guidelines: "https://news.ycombinator.com/newsguidelines.html",
  phLaunchGuide: "https://help.producthunt.com/en/articles/17350772-launch-guide",
  phPreparing: "https://www.producthunt.com/launch/preparing-for-launch",
  phHowItWorks: "https://www.producthunt.com/launch/how-product-hunt-works",
  phUpvotes: "https://help.producthunt.com/en/articles/484935-can-i-ask-my-community-friends-family-to-upvote-a-product",
  sonner: "https://github.com/emilkowalski/sonner",
  sonnerCommit: "https://github.com/emilkowalski/sonner/tree/8e4662b39255120b62138312058f5d77c0139a5e",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "Should I launch on Product Hunt or Show HN first?",
    a: "It depends on what you have ready. Show HN wants something people can try now, with no waitlist. Product Hunt is a launch day with a listing, gallery and maker comment. If your build is usable and you can sit in the thread, Show HN can come first. If you need a polished listing day, Product Hunt fits better. Many developer tools do both on different days.",
  },
  {
    q: "Is Product Hunt free?",
    a: "Product Hunt's How Product Hunt works page says launching costs nothing. Paid options exist for advertising and featured placement, but posting a product does not require a submission fee the way BetaList does.",
  },
  {
    q: "Is Show HN free?",
    a: "Yes. Hacker News lists no fee for posting a Show HN. The cost is time: writing a clear title and first comment, and being around to answer.",
  },
  {
    q: "Can I ask friends to upvote on either site?",
    a: "Both say no. Product Hunt's help page says please don't, and that asking or incentivizing upvotes can drop or remove a product. Show HN guidelines say please don't ask friends to upvote or comment.",
  },
];

export default function ProductHuntVsShowHnPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        Product Hunt and Show HN answer different launch jobs. This page puts their own rules side by side, then runs one fixed launch text through LaunchLoop&apos;s{" "}
        <Link href={TAGLINE_CHECKER.path}>Product Hunt tagline checker</Link> and <Link href={SHOW_HN_CHECKER.path}>Show HN title checker</Link>. LaunchLoop is ours: we build the
        checkers and the launch kit. The platforms are not ours. Prices and rules change, so check each site before you post.
      </p>

      <h2 id="short-answer">Short answer</h2>
      <p>
        Launch on <strong>Show HN</strong> first when people can try the thing today and you can stay in the thread. Launch on <strong>Product Hunt</strong> first when you want a
        scheduled launch day with a listing, gallery images and a maker comment. Do not treat either as a vote contest: both ban asking for upvotes.
      </p>

      <h2 id="side-by-side">What each site asks of a launch</h2>
      <ScrollTable label="Product Hunt versus Show HN rules and format" caption="Product Hunt and Show HN, from each site's own pages" hintTestId="ph-vs-showhn-scroll-hint">
        <thead>
          <tr className="border-b border-border text-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">Job</th>
            <th scope="col" className="py-2 pr-4 font-medium">Product Hunt</th>
            <th scope="col" className="py-2 font-medium">Show HN</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">What it is for</th>
            <td className="py-2 pr-4 align-top">A product listing on a launch day, with upvotes and comments</td>
            <td className="py-2 align-top">Something you made that people can play with</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Ready to try?</th>
            <td className="py-2 pr-4 align-top">A live product is the usual case; unreleased products have separate help rules</td>
            <td className="py-2 align-top"><q>If your work isn&apos;t ready for users to try out, please don&apos;t do a Show HN.</q></td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Off limits</th>
            <td className="py-2 pr-4 align-top">Asking for upvotes; contests that require them</td>
            <td className="py-2 align-top"><q>Off topic: blog posts, sign-up pages, newsletters, lists, and other reading material.</q> Also: <q>Don&apos;t post landing pages or fundraisers.</q></td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Title / tagline</th>
            <td className="py-2 pr-4 align-top">Tagline max 60 characters</td>
            <td className="py-2 align-top">Title begins with &quot;Show HN&quot;; HN&apos;s submit form rejects titles over 80 characters</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Fee to post</th>
            <td className="py-2 pr-4 align-top"><q>Launching costs nothing.</q></td>
            <td className="py-2 align-top">No fee listed</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 pr-4 align-top font-normal">Upvotes</th>
            <td className="py-2 pr-4 align-top"><q>Please don&apos;t. People should upvote things they genuinely like or find interesting, not because they were peer pressured to do so.</q></td>
            <td className="py-2 align-top"><q>Please don&apos;t ask friends to upvote or comment. That&apos;s not ok on HN.</q></td>
          </tr>
        </tbody>
      </ScrollTable>
      <p>
        Show HN quotes are from the <a href={SRC.showHn}>Show HN guidelines</a>, re-read on 9 November 2026. Product Hunt&apos;s tagline limit is from{" "}
        <a href={SRC.phPreparing}>Build your product page</a> (Preparing for launch), which says <q>Tagline (up to 60 characters)</q>, re-read on 9 November 2026. The upvote line is from{" "}
        <a href={SRC.phUpvotes}>Can I ask my community/friends/family to upvote a product?</a>. The fee line is from Product Hunt&apos;s{" "}
        <a href={SRC.phHowItWorks}>How Product Hunt works</a> page (<q>Launching costs nothing.</q>), re-read the same day.
      </p>

      <h2 id="checkers">One launch text, both checkers</h2>
      <p>
        Original element for this page: the same frozen open-source repo text through both LaunchLoop checkers, with every result shown as returned. Repo:{" "}
        <a href={SRC.sonner}>emilkowalski/sonner</a> at commit <a href={SRC.sonnerCommit}><code>8e4662b</code></a> (the same freeze used in{" "}
        <Link href={postPath({ slug: "product-hunt-launch-tools" })}>Product Hunt launch tools, tested on one repo</Link>). Inputs frozen before the run on 9 November 2026:
      </p>
      <ul>
        <li>
          <strong>Product Hunt tagline:</strong> <code>An opinionated toast component for React</code> (40 characters), product name Sonner.
        </li>
        <li>
          <strong>Show HN title:</strong> <code>Show HN: Sonner, an opinionated toast component for React</code> (57 characters).
        </li>
        <li>
          <strong>Show HN first comment:</strong> I built Sonner because most toast libraries felt heavy or hard to style. You add {"<Toaster />"}, call toast(), and it works. The
          demo needs no sign-up. A short post covers how and why I made those choices.
        </li>
      </ul>
      <p>
        <strong>Tagline checker result:</strong> verdict pass. Length pass (fits in 60, 20 spare). No trailing full stop, not all caps, no emoji, no vague hype words, does not
        repeat the product name.
      </p>
      <p>
        <strong>Show HN checker result:</strong> verdict pass. Every rule and tip passed, including the prefix, no hype, no site name, not a version bump, reads as something to try
        now, no asking for votes, no sign-up barrier, and the how/why tip. Title length 57, under the 80-character submit-form check.
      </p>
      <p>
        That does not mean the launch will do well. It only means this text cleared the checks those two tools enforce. Run your own draft on the{" "}
        <Link href={TAGLINE_CHECKER.path}>tagline checker</Link> and <Link href={SHOW_HN_CHECKER.path}>Show HN title checker</Link> before you post.
      </p>

      <h2 id="when-which">When to pick which</h2>
      <ul>
        <li>
          <strong>Show HN first</strong> if the build is tryable without a waitlist, you can answer questions the same day, and you are fine with a plain title. Read{" "}
          <Link href="/how-to-write-a-show-hn-post">how to write a Show HN post</Link> and the <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link>.
        </li>
        <li>
          <strong>Product Hunt first</strong> if you want a scheduled day, gallery images and a maker comment. Read{" "}
          <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link> and the{" "}
          <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link>.
        </li>
        <li>
          <strong>Neither yet</strong> if you only have a waitlist: Show HN says not to, and Product Hunt is a poor fit for a bare waitlist. BetaList is built for that stretch; see{" "}
          <Link href={postPath({ slug: "how-to-launch-on-betalist" })}>how to launch on BetaList</Link> and{" "}
          <Link href={postPath({ slug: "betalist-vs-uneed" })}>BetaList or Uneed</Link>.
        </li>
      </ul>
      <p>
        Indie Hackers and the wider board list are covered in <Link href={postPath({ slug: "how-to-launch-on-indie-hackers" })}>how to launch on Indie Hackers</Link> and{" "}
        <Link href={postPath({ slug: "product-hunt-alternatives" })}>Product Hunt alternatives</Link>.
      </p>

      <h2 id="next">Next steps</h2>
      <p>
        Draft the listing or the Show HN comment in your own words. Check the tagline and title with the free tools above. LaunchLoop&apos;s kit drafts Product Hunt copy and
        images from a repo; it does not write Show HN posts. Start with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="Product Hunt or Show HN: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of November 2026. Show HN guideline quotes were re-read on news.ycombinator.com on 9 November 2026. Product Hunt tagline and upvote quotes follow the
        source-check logs for our Product Hunt posts (Launch Guide, Preparing for launch, and the friends-and-family upvote article). The checker run used the Sonner commit above
        on 9 November 2026. Rules change, so open each link before you post.
      </p>
      <ul>
        <li><a href={SRC.showHn}>Show HN guidelines</a></li>
        <li><a href={SRC.guidelines}>Hacker News guidelines</a></li>
        <li><a href={SRC.phLaunchGuide}>Product Hunt Launch Guide</a></li>
        <li><a href={SRC.phPreparing}>Preparing for launch</a></li>
        <li><a href={SRC.phHowItWorks}>How Product Hunt works</a></li>
        <li><a href={SRC.phUpvotes}>Can I ask my community/friends/family to upvote a product?</a></li>
        <li><a href={SRC.sonner}>emilkowalski/sonner</a> at <a href={SRC.sonnerCommit}>commit 8e4662b</a></li>
      </ul>
    </BlogPostLayout>
  );
}
