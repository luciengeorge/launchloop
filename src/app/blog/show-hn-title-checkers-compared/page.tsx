import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { ScrollTable } from "@/components/scroll-table";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";
import { SHOW_HN_CHECKER } from "@/lib/tools";

const p = post("show-hn-title-checkers-compared");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const SRC = {
  showHn: "https://news.ycombinator.com/showhn.html",
  guidelines: "https://news.ycombinator.com/newsguidelines.html",
  launchranked: "https://launchranked.com/tools/show-hn-title-scorer",
  launchrankedPost: "https://launchranked.com/blog/how-to-post-a-show-hn",
  reavlo: "https://reavlo.com/tools/show-hn-title-checker",
  aback: "https://abacklaunch.com/tools/show-hn-title-scorer",
  shipx: "https://shipx.live/tools/show-hn-title-scorer",
  discover: "https://discoverlaunches.com/tools/show-hn",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "Which Show HN title checker should you use?",
    a: "Use a checker that quotes Hacker News's own rules when it flags something, and that tells you when a check is only the tool's advice. LaunchLoop's checker does that and also checks the first comment. LaunchRanked and Reavlo also quote or tag HN rules on the title. Aback Launch returns a 0 to 100 Title score. None of them can predict whether HN will upvote the post.",
  },
  {
    q: "Is LaunchLoop's Show HN title checker free?",
    a: "Yes. It runs in your browser, needs no account, and does not upload the title. It is separate from the paid launch kit.",
  },
  {
    q: "Do these checkers use AI?",
    a: "LaunchLoop's checks are plain patterns, not AI. LaunchRanked shows a checklist score as you type and says an AI score appears when you stop typing. Reavlo and Aback Launch describe browser-side checks on their pages. This comparison reports the checklist or score each tool showed for our ten titles, not any delayed AI score we did not wait for.",
  },
  {
    q: "Is there an official Hacker News title checker?",
    a: "No. These are third-party tools. The rules come from HN's Show HN guidelines and site guidelines. The 80-character title limit comes from HN's published news.arc source, not from those guideline pages.",
  },
];

export default function ShowHnTitleCheckersComparedPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        Several free Show HN title checkers exist. This page runs the same ten titles through LaunchLoop&apos;s{" "}
        <Link href={SHOW_HN_CHECKER.path}>Show HN title checker</Link>, LaunchRanked&apos;s title scorer, Reavlo&apos;s title checker and Aback Launch&apos;s title scorer, then
        records what each one showed. LaunchLoop is ours. We disclose that up front. The other tools are not affiliated with us. A fresh web search on 9 November 2026 also listed
        scorers on ShipX and DiscoverLaunches; we did not run those two in this pass.
      </p>

      <h2 id="short-answer">Short answer</h2>
      <p>
        If you want each flag tied to a quoted HN sentence, and you also want the first comment checked, use LaunchLoop&apos;s checker. If you want a title-only checklist that tags
        HN rules, LaunchRanked and Reavlo both did that on our run. If you want a single 0 to 100 Title score, Aback Launch showed one. No checker replaces reading the{" "}
        <a href={SRC.showHn}>Show HN guidelines</a>.
      </p>

      <h2 id="method">Method (9 November 2026)</h2>
      <p>
        Original element: the same ten titles in each tool, with outputs saved. Titles mix a clean pass, capitals and hype, a domain and listicle number, a version bump, a waitlist,
        a video without a <code>[video]</code> tag, a strong title with a dirty first comment (comment checked only where the tool accepts one), a second clean pass, a lowercase
        prefix, and an over-length title. LaunchLoop was run in-process against <code>src/lib/show-hn-check.ts</code>. LaunchRanked, Reavlo and Aback Launch were driven in a headless
        browser: paste title, wait for the live result, save the visible text. First output only. Nothing was posted to HN.
      </p>

      <h2 id="tools">Tools in this comparison</h2>
      <ul>
        <li>
          <strong>LaunchLoop</strong> (<Link href={SHOW_HN_CHECKER.path}>/tools/show-hn-title-checker</Link>): title and optional first comment; each rule quotes HN; tips labelled as
          ours; separate submit-form check at 81+ characters.
        </li>
        <li>
          <strong>LaunchRanked</strong> (<a href={SRC.launchranked}>title scorer</a>): title checklist tagged HN rule; page also mentions an AI score after idle typing. We record the
          checklist line <q>N of 10 checks pass</q> from the run, not a later AI score.
        </li>
        <li>
          <strong>Reavlo</strong> (<a href={SRC.reavlo}>title checker</a>): title only; findings with SHN codes and guideline quotes. Its own docs say it does not check length.
        </li>
        <li>
          <strong>Aback Launch</strong> (<a href={SRC.aback}>title scorer</a>): Title score out of 100 and a fixed checklist of format, length, hype, emoji and clarity items.
        </li>
      </ul>

      <h2 id="results">Results on the ten titles</h2>
      <p>LaunchLoop column lists warn check ids. LaunchRanked shows checklist passes. Reavlo shows critical / warning / info counts. Aback shows the Title score on screen.</p>
      <ScrollTable label="Show HN title checkers on ten titles" caption="Same ten titles through four Show HN title checkers, 9 November 2026" hintTestId="showhn-checkers-scroll-hint">
        <thead>
          <tr className="border-b border-border text-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">Title (short)</th>
            <th scope="col" className="py-2 pr-4 font-medium">LaunchLoop</th>
            <th scope="col" className="py-2 pr-4 font-medium">LaunchRanked</th>
            <th scope="col" className="py-2 pr-4 font-medium">Reavlo</th>
            <th scope="col" className="py-2 font-medium">Aback score</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Gridcast CSV dashboard (clean)</th>
            <td className="py-2 pr-4 align-top">pass</td>
            <td className="py-2 pr-4 align-top">10 of 10</td>
            <td className="py-2 pr-4 align-top">0 / 0 / 0, 8 passed</td>
            <td className="py-2 align-top">90</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">GRIDCAST, the best…!</th>
            <td className="py-2 pr-4 align-top">warn: caps, hype, exclaim</td>
            <td className="py-2 pr-4 align-top">8 of 10 (fail on capitals / exclamation)</td>
            <td className="py-2 pr-4 align-top">0 / 3 / 0: uppercase, exclamation, hype</td>
            <td className="py-2 align-top">80</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Gridcast.app, 10 amazing…</th>
            <td className="py-2 pr-4 align-top">warn: domain, number, hype</td>
            <td className="py-2 pr-4 align-top">8 of 10</td>
            <td className="py-2 pr-4 align-top">0 / 1 / 0: hype (amazing)</td>
            <td className="py-2 align-top">75</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Gridcast 2.4.1 is out…</th>
            <td className="py-2 pr-4 align-top">warn: upgrade</td>
            <td className="py-2 pr-4 align-top">10 of 10</td>
            <td className="py-2 pr-4 align-top">0 / 0 / 1: new-version info</td>
            <td className="py-2 align-top">90</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Join the waitlist…</th>
            <td className="py-2 pr-4 align-top">warn: offtopic (waitlist)</td>
            <td className="py-2 pr-4 align-top">10 of 10</td>
            <td className="py-2 pr-4 align-top">0 / 1 / 0: landing / waitlist</td>
            <td className="py-2 align-top">90</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Split keyboard (link=video)</th>
            <td className="py-2 pr-4 align-top">warn: media (add [video])</td>
            <td className="py-2 pr-4 align-top">9 of 10</td>
            <td className="py-2 pr-4 align-top">0 / 0 / 0, 8 passed</td>
            <td className="py-2 align-top">75</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Ledgerline title only</th>
            <td className="py-2 pr-4 align-top">pass on title; comment would warn asks, signup, emphasis</td>
            <td className="py-2 pr-4 align-top">10 of 10 (title only)</td>
            <td className="py-2 pr-4 align-top">0 / 0 / 0, 8 passed</td>
            <td className="py-2 align-top">100</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">Toast library for React</th>
            <td className="py-2 pr-4 align-top">pass</td>
            <td className="py-2 pr-4 align-top">10 of 10</td>
            <td className="py-2 pr-4 align-top">0 / 0 / 0, 8 passed</td>
            <td className="py-2 align-top">100</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">show hn: lowercase…</th>
            <td className="py-2 pr-4 align-top">warn: prefix</td>
            <td className="py-2 pr-4 align-top">8 of 10 (prefix warning)</td>
            <td className="py-2 pr-4 align-top">1 critical: prefix</td>
            <td className="py-2 align-top">60</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 pr-4 align-top font-normal">99-character xxxxxx title</th>
            <td className="py-2 pr-4 align-top">warn: length (form), describes tip</td>
            <td className="py-2 pr-4 align-top">8 of 10</td>
            <td className="py-2 pr-4 align-top">0 / 0 / 0, 8 passed (no length check)</td>
            <td className="py-2 align-top">50</td>
          </tr>
        </tbody>
      </ScrollTable>

      <h2 id="what-differed">What differed</h2>
      <ul>
        <li>
          <strong>Waitlist.</strong> LaunchLoop and Reavlo flagged <q>Join the waitlist for my budgeting app</q>. LaunchRanked&apos;s checklist still read 10 of 10. Show HN says{" "}
          <q>Off topic: blog posts, sign-up pages, newsletters, lists, and other reading material.</q> and <q>If your work isn&apos;t ready for users to try out, please don&apos;t do a
          Show HN.</q>
        </li>
        <li>
          <strong>Version bump.</strong> LaunchLoop warned on <q>Gridcast 2.4.1 is out with dark mode</q>. Reavlo logged an info finding citing{" "}
          <q>New features and upgrades (&quot;Foo 1.3.1 is out&quot;) generally aren&apos;t substantive enough to be Show HNs. A major overhaul is probably ok.</q> LaunchRanked&apos;s
          checklist stayed at 10 of 10.
        </li>
        <li>
          <strong>Length.</strong> LaunchLoop and Aback reacted to the 99-character title. Reavlo passed all eight checks and states it does not check length. LaunchRanked showed 8 of
          10.
        </li>
        <li>
          <strong>First comment.</strong> Only LaunchLoop accepts a first comment in the same run. On the Ledgerline example, the dirty comment triggers asks, signup and emphasis
          warns; the title alone passes everywhere we ran.
        </li>
        <li>
          <strong>Hype lists differ.</strong> Reavlo warned on <q>amazing</q> in the Gridcast.app title. LaunchLoop also flagged domain and listicle number on that title. Aback&apos;s
          listed hype examples on the page were words such as revolutionary and ultimate; its Title score still fell from 90 on the clean title to 75 on this one.
        </li>
      </ul>
      <p>
        Where LaunchLoop flags something another tool does not, that is a fact about these runs, not a claim that HN would remove the post. Where another tool flags something we do
        not, the same rule applies in reverse.
      </p>

      <h2 id="next">Next steps</h2>
      <p>
        Paste your draft into the <Link href={SHOW_HN_CHECKER.path}>Show HN title checker</Link>, then read the <a href={SRC.showHn}>Show HN guidelines</a>. For the wider launch
        choice, see <Link href={postPath({ slug: "product-hunt-vs-show-hn" })}>Product Hunt or Show HN</Link> and the <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link>.
        LaunchLoop&apos;s kit drafts Product Hunt copy from a repo; start with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="Show HN title checkers: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of November 2026. Tool runs and HN guideline fetches were done on 9 November 2026. LaunchRanked&apos;s blog post that names a Show HN title scorer is{" "}
        <a href={SRC.launchrankedPost}>How to post a Show HN on Hacker News</a>. ShipX and DiscoverLaunches tool URLs were found in the same day&apos;s search and are listed for
        completeness only.
      </p>
      <ul>
        <li><a href={SRC.showHn}>Show HN guidelines</a></li>
        <li><a href={SRC.guidelines}>Hacker News guidelines</a></li>
        <li><a href="https://launchloop.dev/tools/show-hn-title-checker">LaunchLoop Show HN title checker</a></li>
        <li><a href={SRC.launchranked}>LaunchRanked Show HN title scorer</a></li>
        <li><a href={SRC.reavlo}>Reavlo Show HN title checker</a></li>
        <li><a href={SRC.aback}>Aback Launch Show HN title scorer</a></li>
        <li><a href={SRC.shipx}>ShipX Show HN title scorer</a> (not run)</li>
        <li><a href={SRC.discover}>DiscoverLaunches Show HN title scorer</a> (not run)</li>
      </ul>
    </BlogPostLayout>
  );
}
