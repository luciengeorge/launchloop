import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { ScrollTable } from "@/components/scroll-table";
import { post, postPath } from "@/lib/blog";
import { FREE_PREVIEW } from "@/lib/site";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";
import { TAGLINE_CHECKER } from "@/lib/tools";

const p = post("launchloop-alternatives");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const SRC = {
  startkitz: "https://startkitz.com/",
  overnight: "https://www.overnightcut.com/",
  phLaunchKit: "https://phlaunchkit.com/tools/product-hunt-tagline-generator",
  marketingPack: "https://getmarketingpack.com/product-hunt-launch-kit",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "What is a LaunchLoop alternative?",
    a: "Another tool that turns a repo or URL into launch copy or assets. StartKitz generates a marketing kit from a URL. Some tools write only Product Hunt taglines. Overnight Cut, on the day we read it, sells product video rather than text kits. Platforms such as Product Hunt or BetaList are not LaunchLoop alternatives; they are places to launch.",
  },
  {
    q: "Is LaunchLoop free?",
    a: "LaunchLoop has a free preview: the product brief, Product Hunt tagline, the first post of your X thread and three watermarked images. No account or card is required for that preview. The full kit is a one-off payment.",
  },
  {
    q: "Which LaunchLoop alternative is best?",
    a: "There is no single best kit. Pick by job: full marketing ZIP, taglines only, images, or video. Read each product's own page for what the free tier returns, then run one repo through the free path before you pay.",
  },
  {
    q: "Do these tools replace Product Hunt or Show HN?",
    a: "No. They draft copy or assets. You still submit on each platform and follow that platform's rules. For where to launch, see our Product Hunt alternatives post.",
  },
];

export default function LaunchloopAlternativesPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        People searching for LaunchLoop alternatives usually want another way to turn a repo or URL into launch copy. This page names those products from their own pages, says
        plainly what LaunchLoop does, and points at our longer free-tier test where we already ran tools on one repo. LaunchLoop is ours. We do not rank winners here. We later ran the
        ChatGPT-versus-kits test on a second repo: see{" "}
        <Link href={postPath({ slug: "chatgpt-vs-product-hunt-launch-kits" })}>Can ChatGPT write Product Hunt launch copy?</Link>.
      </p>

      <h2 id="what-launchloop-does">What LaunchLoop does</h2>
      <p>
        LaunchLoop reads a public GitHub repo and live page, then drafts a launch kit: landing copy, a Product Hunt post (tagline, description, topics, maker comment), an X thread, a
        LinkedIn post, on-brand images and a checklist. The free preview shows: {FREE_PREVIEW.join("; ")}. It does not write Show HN, Reddit or Indie Hackers posts. Start with a{" "}
        <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <h2 id="kits-from-their-pages">Other launch kits, from their own pages</h2>
      <p>Read on 9 November 2026 unless noted. Quotes stop before any en or em dash on the source page.</p>
      <ScrollTable label="Launch kit alternatives compared" caption="What each product's own page said it writes" hintTestId="ll-alt-scroll-hint">
        <thead>
          <tr className="border-b border-border text-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">Product</th>
            <th scope="col" className="py-2 pr-4 font-medium">Input</th>
            <th scope="col" className="py-2 font-medium">What its page says you get</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal">LaunchLoop (ours)</th>
            <td className="py-2 pr-4 align-top">GitHub repo or live URL</td>
            <td className="py-2 align-top">Free preview as above; paid kit adds full Product Hunt fields, rest of the X thread, LinkedIn, unwatermarked images</td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal"><a href={SRC.startkitz}>StartKitz</a></th>
            <td className="py-2 pr-4 align-top">App URL</td>
            <td className="py-2 align-top">
              Homepage says <q>Free to generate. No account required.</q> It describes a marketing stack that includes Product Hunt copy, social posts and a ZIP. Free plan card on the
              same day listed a growth score, punchline, homepage hero rewrite and more at <q>Free $0 one-time</q>.
            </td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal"><a href={SRC.overnight}>Overnight Cut</a></th>
            <td className="py-2 pr-4 align-top">Product footage / storyboard flow</td>
            <td className="py-2 align-top">
              On 9 November 2026 the site presented itself as a <q>Product video studio for software teams</q> with a free storyboard, not as a text launch-copy writer. Treat it as
              video, not a drop-in text-kit replacement.
            </td>
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="py-2 pr-4 align-top font-normal"><a href={SRC.phLaunchKit}>PH LaunchKit</a></th>
            <td className="py-2 pr-4 align-top">Typed product fields</td>
            <td className="py-2 align-top">Tagline generator. In our 27 October 2026 free-tier run it returned 8 Product Hunt taglines, all under 60 characters. Details in the launch-tools post.</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 pr-4 align-top font-normal"><a href={SRC.marketingPack}>Marketing Pack</a></th>
            <td className="py-2 pr-4 align-top">Website URL</td>
            <td className="py-2 align-top">Product Hunt copy and images. One free pack every 30 days on the day we tested (27 October 2026). See the launch-tools post for counts.</td>
          </tr>
        </tbody>
      </ScrollTable>
      <p>
        ShipProof&apos;s site did not return usable HTML on 9 November 2026 (empty body from shipproof.com), so this page does not restate its earlier claims. For the full 10-tool
        Sonner run, including ChatGPT logged out, read <Link href={postPath({ slug: "product-hunt-launch-tools" })}>Product Hunt launch tools, tested on one repo</Link>.
      </p>

      <h2 id="how-to-choose">How to choose</h2>
      <ul>
        <li>
          <strong>Need a full text kit from a repo.</strong> Compare LaunchLoop&apos;s free preview with StartKitz&apos;s free generate path on the same URL, then read what each locks.
        </li>
        <li>
          <strong>Need taglines only.</strong> PH LaunchKit and LaunchLoop&apos;s <Link href={TAGLINE_CHECKER.path}>tagline checker</Link> both target Product Hunt&apos;s 60-character
          limit.
        </li>
        <li>
          <strong>Need video.</strong> Overnight Cut&apos;s own positioning on 9 November 2026 was product video, not listing copy.
        </li>
        <li>
          <strong>Need a place to launch, not a kit.</strong> That is a platform question: see <Link href={postPath({ slug: "product-hunt-alternatives" })}>Product Hunt alternatives</Link>
          , <Link href={postPath({ slug: "product-hunt-vs-show-hn" })}>Product Hunt or Show HN</Link>, and{" "}
          <Link href={postPath({ slug: "betalist-vs-uneed" })}>BetaList or Uneed</Link>.
        </li>
      </ul>

      <h2 id="next">Next steps</h2>
      <p>
        Run one public repo through each free path you are considering. Keep the first output only, and count characters with the same rule the platform uses. Then edit in your own
        words before you post. For ChatGPT next to these kits on one frozen repo, read{" "}
        <Link href={postPath({ slug: "chatgpt-vs-product-hunt-launch-kits" })}>Can ChatGPT write Product Hunt launch copy?</Link>.
      </p>

      <Faq path={postPath(p)} title="LaunchLoop alternatives: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of November 2026. StartKitz and Overnight Cut were read on their homepages on 9 November 2026. PH LaunchKit and Marketing Pack facts that refer to outputs come from
        the 27 October 2026 launch-tools source check, not a new run. LaunchLoop&apos;s free preview list matches the product copy on this site.
      </p>
      <ul>
        <li><a href={SRC.startkitz}>StartKitz</a></li>
        <li><a href={SRC.overnight}>Overnight Cut</a></li>
        <li><a href={SRC.phLaunchKit}>PH LaunchKit tagline generator</a></li>
        <li><a href={SRC.marketingPack}>Marketing Pack Product Hunt launch kit</a></li>
        <li><a href="https://launchloop.dev/blog/product-hunt-launch-tools">Product Hunt launch tools, tested on one repo</a> (27 October 2026 run)</li>
      </ul>
    </BlogPostLayout>
  );
}
