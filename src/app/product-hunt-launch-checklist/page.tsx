import type { Metadata } from "next";
import Link from "next/link";
import { GuideLayout } from "@/components/guide-layout";
import { guide } from "@/lib/guides";
import { guidePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";

const g = guide("product-hunt-launch-checklist");

export const metadata: Metadata = pageMetadata(guidePage(g));

export default function ProductHuntChecklistPage() {
  return (
    <GuideLayout guide={g}>
      <p>
        A good Product Hunt launch is mostly preparation. On the day itself you should be replying to comments, not writing copy or resizing images. This checklist covers
        everything to get ready, in the order to do it.
      </p>

      <h2 id="one-week-out">One week out</h2>
      <ul>
        <li><strong>Make sure the product works for a stranger.</strong> Sign up in a private window, on mobile, with a fresh email. Fix anything that blocks the first minute.</li>
        <li><strong>Check your landing page meta tags.</strong> A clear title (around 60 characters), a meta description (around 155), and a 1200×630 Open Graph image, so every shared link previews properly.</li>
        <li><strong>Set up your maker profile.</strong> A real photo, a short bio and links. Hunters and voters click through to see who built the thing.</li>
        <li><strong>Decide whether you need a hunter.</strong> You can hunt your own product. A hunter helps only if they genuinely know the space; it is not a requirement.</li>
        <li><strong>Pick a day.</strong> Launches run from 00:01 Pacific Time, which is 08:01 UK time for most of the year. Weekdays have more traffic and more competition; weekends are quieter on both counts.</li>
        <li><strong>Tell people you are launching, without asking for votes.</strong> Share the date with your newsletter, community and early users and ask for feedback on launch day.</li>
      </ul>

      <h2 id="the-listing">Write the listing</h2>
      <ul>
        <li><strong>Name:</strong> the product name only, no tagline stuffed in.</li>
        <li>
          <strong>Tagline: 60 characters maximum.</strong> Say what it does and for whom. &ldquo;AI-powered platform for productivity&rdquo; says nothing; &ldquo;Turn your GitHub repo into a launch kit&rdquo; says something.
          Test yours with the free <Link href="/tools/product-hunt-tagline-checker">Product Hunt tagline checker</Link>.
        </li>
        <li><strong>Description: 260 characters maximum.</strong> The problem, what the product does about it, and one concrete detail that only your product can claim.</li>
        <li><strong>Topics:</strong> up to three that match where your users browse.</li>
        <li><strong>Maker comment:</strong> the first comment, posted as soon as you go live. Why you built it, what it does today, what is next, and a specific question you want answered.</li>
      </ul>

      <h2 id="images">Prepare the images</h2>
      <ul>
        <li><strong>Thumbnail:</strong> a square 240×240 logo or icon that reads at small sizes.</li>
        <li><strong>Gallery:</strong> 1270×760 images. Lead with the result, not your login screen. Three to five images, each with one idea.</li>
        <li><strong>Optional video or demo:</strong> under a minute, showing the product doing its main job.</li>
        <li>
          <strong>Social images:</strong> a 1200×630 Open Graph image for your site and a 1600×900 image for X and LinkedIn launch posts. See how your link shares with the free{" "}
          <Link href="/tools/og-preview">OG image preview</Link>.
        </li>
      </ul>

      <h2 id="rules">The rules that get launches penalised</h2>
      <p>
        Product Hunt explicitly bans asking for upvotes, and its systems discount votes that look coordinated: lots of new accounts, or people arriving from a direct link to vote.
        Hacker News has the same rule and also bans asking for comments. Ask people to <em>check it out</em>, never to vote (or, on HN, to comment). Do not buy votes or join vote-swap groups.
      </p>

      <h2 id="launch-day">Launch day</h2>
      <ol>
        <li>Confirm the listing is live just after 00:01 PT and post your maker comment.</li>
        <li>Post your X thread and LinkedIn post with the Product Hunt link, written ahead of time.</li>
        <li>Email your list and post in the communities you are actually part of, following each one&apos;s self-promotion rules.</li>
        <li>Reply to every comment, quickly and specifically. This is the most valuable thing you can do all day.</li>
        <li>Post a mid-day update on X with something real: a fix shipped from feedback, a question you got asked a lot.</li>
        <li>Watch error tracking and sign-ups. A launch is a load test you did not schedule.</li>
      </ol>

      <h2 id="after">The week after</h2>
      <ul>
        <li>Thank commenters and follow up on the feature requests you said you would look at.</li>
        <li>Turn the best questions into FAQ entries and landing page copy.</li>
        <li>Keep shipping in public. Every release is a reason to post again, which is the idea behind <Link href="/ship-loop">Ship Loop</Link>.</li>
      </ul>

      <p>
        If you built your app with an AI builder, read <Link href="/how-to-launch-a-vibe-coded-app">how to launch a vibe-coded app</Link> for the pre-launch fixes those tools tend to
        skip. To get the whole listing, threads and images drafted from your repo, see <Link href="/pricing">pricing</Link>.
      </p>
    </GuideLayout>
  );
}
