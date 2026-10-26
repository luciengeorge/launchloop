import Link from "next/link";
import { IMAGE_VARIANTS } from "@/lib/image-variants";
import { LIMITS } from "@/lib/limits";
import { OG_PREVIEW } from "@/lib/tools";

/** Only list a rule as followed if the prompts or rubric in src/lib/copy.ts (or the sizes in image-variants.ts) actually apply it. */
const SRC = {
  phLaunchGuide: "https://help.producthunt.com/en/articles/17350772-launch-guide",
  phHowToPost: "https://help.producthunt.com/en/articles/479557-how-to-post-a-product",
  hnGuidelines: "https://news.ycombinator.com/newsguidelines.html",
  showHn: "https://news.ycombinator.com/showhn.html",
  showHnTips: "https://news.ycombinator.com/item?id=22336638",
  xCounting: "https://docs.x.com/fundamentals/counting-characters",
  linkedinPosts: "https://www.linkedin.com/help/linkedin/answer/a528176",
  linkedinShare: "https://www.linkedin.com/help/linkedin/answer/a521928",
  redditRules: "https://redditinc.com/policies/reddit-rules",
} as const;

const size = (v: keyof typeof IMAGE_VARIANTS) => `${IMAGE_VARIANTS[v].width}×${IMAGE_VARIANTS[v].height}`;
const n = (value: number) => value.toLocaleString("en-GB");

export function AdviceSources() {
  return (
    <div
      data-testid="advice-sources"
      className="mt-4 space-y-4 leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
    >
      <h3>Rules from the platforms, and where they&apos;re published</h3>
      <ul>
        <li>
          <strong>
            Product Hunt tagline, description and topics: {LIMITS.phTagline} characters, {LIMITS.phDescription} characters and up to three topics.
          </strong>{" "}
          All three come from Product Hunt&apos;s <a href={SRC.phLaunchGuide}>Launch Guide</a>. LaunchLoop checks every kit against them and trims anything over the limit. For
          the writing side, read <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt tagline</Link>.
        </li>
        <li>
          <strong>Product Hunt gallery image: {size("ph")}.</strong> The size Product Hunt&apos;s <a href={SRC.phHowToPost}>How to post a product</a> page recommends.
        </li>
        <li>
          <strong>Never asking for upvotes.</strong> Product Hunt&apos;s Launch Guide says never to ask outright for upvotes, and the{" "}
          <a href={SRC.hnGuidelines}>Hacker News guidelines</a> say <q>Don&apos;t solicit upvotes, comments, or submissions.</q> LaunchLoop&apos;s prompts forbid vote
          requests, every draft is checked for them, and any it finds are removed. The launch-day checklist says to ask for feedback, not votes. More in the{" "}
          <Link href="/product-hunt-launch-checklist#rules">Product Hunt launch checklist</Link>.
        </li>
        <li>
          <strong>X posts: {LIMITS.xPost} characters.</strong> Counted the way X&apos;s developer docs on <a href={SRC.xCounting}>counting characters</a> describe, with every
          link counted as 23 characters. Each post in your thread is checked and fitted to that.
        </li>
        <li>
          <strong>LinkedIn post: {n(LIMITS.linkedin)} characters.</strong> The limit in LinkedIn Help&apos;s page on <a href={SRC.linkedinPosts}>posting updates</a>.
        </li>
        <li>
          <strong>Open Graph image: {size("og")}.</strong> That meets LinkedIn&apos;s <a href={SRC.linkedinShare}>link preview requirements</a> of at least 1200×627 pixels at
          1.91:1. See how your own link shares with the free <Link href={OG_PREVIEW.path}>OG image preview</Link>.
        </li>
      </ul>

      <h3>LaunchLoop&apos;s own choices</h3>
      <p>
        Some limits are house style, not platform rules: {LIMITS.xThreadMin} to {LIMITS.xThreadMax} posts in the X thread, no hashtags on X and at most two on LinkedIn, a{" "}
        {LIMITS.metaTitle}-character meta title and {LIMITS.metaDescription}-character meta description, a {n(LIMITS.phMakerComment)}-character maker comment, the{" "}
        {size("x")} post image, and a list of hype words to avoid. They keep the copy tight, and you can edit any of it.
      </p>

      <h3>Show HN and Reddit</h3>
      <p>
        LaunchLoop doesn&apos;t write Show HN or Reddit posts, so it doesn&apos;t apply the <a href={SRC.showHn}>Show HN rules</a> (such as a title that begins with
        &ldquo;Show HN&rdquo;) or any subreddit&apos;s rules for you. The launch-day checklist reminds you to follow each community&apos;s self-promotion rules, as{" "}
        <a href={SRC.redditRules}>Reddit&apos;s rules</a> ask of everyone. Our guides cover both: the <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link>,{" "}
        <Link href="/how-to-write-a-show-hn-post">how to write a Show HN post</Link> and <Link href="/how-to-promote-on-reddit">how to promote your app on Reddit</Link>.
      </p>

      <h3>What the AI writes</h3>
      <p>
        All the copy in your kit is drafted by AI: the product brief, landing page copy, Product Hunt tagline, description and maker comment, X thread and LinkedIn post.
        LaunchLoop reads your public repo (README, package.json and recent commit messages) and your live page, then sends that material through Vercel AI Gateway to
        Anthropic&apos;s Claude Sonnet 4.5 and Claude Haiku 4.5, with OpenAI&apos;s GPT-5 mini as a fallback (see the <Link href="/privacy">privacy policy</Link>). The prompts
        tell the model to use only facts from your repo and site and never to invent numbers, users or testimonials, but AI can still get things wrong. The images are
        rendered from a template in your site&apos;s colours, and the launch-day checklist is written by us.
      </p>
      <p>
        <strong>Treat the copy as a first draft.</strong> Check every fact, then edit it until it sounds like you. Some platforms ask for your own words: the{" "}
        <a href={SRC.hnGuidelines}>Hacker News guidelines</a> say <q>Please don&apos;t put generated text in HN posts.</q> HN moderator dang&apos;s{" "}
        <a href={SRC.showHnTips}>Show HN tips</a> put it as <q>Write your text by hand.</q> Product Hunt&apos;s <a href={SRC.phLaunchGuide}>Launch Guide</a> asks for a genuine
        first comment, so make the maker comment yours before you post it.
      </p>

      <h3>What LaunchLoop doesn&apos;t do</h3>
      <p>
        It doesn&apos;t post anything for you: you review, edit and post every draft yourself. And it can&apos;t promise a ranking, upvotes or any other result, as our{" "}
        <Link href="/terms">terms</Link> say.
      </p>
    </div>
  );
}
