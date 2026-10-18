import type { Metadata } from "next";
import Link from "next/link";
import { GuideLayout } from "@/components/guide-layout";
import { guide } from "@/lib/guides";
import { guidePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";

const g = guide("how-to-launch-a-vibe-coded-app");

export const metadata: Metadata = pageMetadata(guidePage(g));

export default function VibeCodedLaunchPage() {
  return (
    <GuideLayout guide={g}>
      <p>
        Cursor, Lovable, Bolt and v0 make it possible to go from idea to working app in a weekend. Launching is where most of those apps stall: the app works, but nobody can find
        it, links share as a blank card, and the launch copy reads like every other AI tool. Here is how to close that gap.
      </p>

      <h2 id="pre-launch-fixes">1. Fix what AI builders usually skip</h2>
      <h3>Titles, descriptions and the favicon</h3>
      <p>
        Generated apps often ship with a default title such as &ldquo;Vite + React&rdquo; or &ldquo;Create Next App&rdquo; and the framework&apos;s favicon. Give every page a
        unique title of around 60 characters and a description of around 155, and replace the favicon and app icons with your own mark.
      </p>
      <h3>Social preview images</h3>
      <p>
        Without an Open Graph image, links on X, LinkedIn, Slack and iMessage share as plain text. Add a 1200×630 <code>og:image</code> and a{" "}
        <code>twitter:card</code> of <code>summary_large_image</code>, then test the link before you launch: the free <Link href="/tools/og-preview">OG image preview</Link>{" "}
        shows the card and flags missing tags or a wrongly sized image.
      </p>
      <h3>Server-rendered text</h3>
      <p>
        Many builder templates are single-page apps that render everything in the browser. Search engines and link previewers may see an almost empty page. Make sure your
        headline, description and key features exist in the HTML: server-render or pre-render the landing page, or at least put real content in the meta tags.
      </p>
      <h3>The boring essentials</h3>
      <ul>
        <li>A <code>sitemap.xml</code> and a <code>robots.txt</code> that does not block your landing page.</li>
        <li>A privacy policy and terms, especially if you take payments or emails.</li>
        <li>Error tracking and analytics, so you can see what breaks on launch day.</li>
        <li>Secrets out of the client bundle. AI-generated code sometimes puts API keys in front-end code; rotate any that were ever committed.</li>
      </ul>

      <h2 id="positioning">2. Write copy from what the app actually does</h2>
      <p>
        The fastest way to sound generic is to describe your app in the words you used to prompt it. Start from facts instead: what the README says it does, the features in
        your recent commits, the stack, the limits. Then write:
      </p>
      <ul>
        <li><strong>One sentence</strong> that says who it is for and what changes for them.</li>
        <li><strong>Three to six features</strong>, each a concrete capability rather than an adjective.</li>
        <li><strong>One proof point</strong> only your product can claim: a number, a constraint, a workflow.</li>
      </ul>
      <p>
        That brief becomes your hero headline, your Product Hunt tagline and the first post of your X thread. Check the tagline against the 60-character limit with the free{" "}
        <Link href="/tools/product-hunt-tagline-checker">Product Hunt tagline checker</Link>, or have it write three options from your repo.
      </p>

      <h2 id="channels">3. Pick your launch channels</h2>
      <ul>
        <li><strong>Product Hunt:</strong> best for tools aimed at makers and early adopters. Follow the <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link>.</li>
        <li><strong>X:</strong> a 5–7 post thread showing the problem, the product in action and the link. Each post must fit X&apos;s 280-character weighting, where every link counts as 23.</li>
        <li><strong>LinkedIn:</strong> one post with a strong first line, short paragraphs and the story of why you built it. The limit is 3,000 characters, but shorter usually does better.</li>
        <li><strong>Communities:</strong> Indie Hackers, relevant subreddits and Discords, Show HN. Read the self-promotion rules first and never ask for upvotes.</li>
      </ul>

      <h2 id="build-in-public">4. Keep launching</h2>
      <p>
        A launch is a day; distribution is a habit. Every meaningful release is a reason to post a short update with a fresh image. Small, regular posts compound in a way one big
        launch does not.
      </p>

      <h2 id="shortcut">The shortcut</h2>
      <p>
        LaunchLoop does steps 2 and 3 for you. It reads your public repo and live site, writes the brief, then drafts the landing copy, Product Hunt post, X thread, LinkedIn
        post and three on-brand images, with every character limit checked. See <Link href="/pricing">pricing</Link> or the <Link href="/faq">FAQ</Link>.
      </p>
    </GuideLayout>
  );
}
