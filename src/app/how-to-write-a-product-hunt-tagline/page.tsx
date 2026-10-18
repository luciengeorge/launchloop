import type { Metadata } from "next";
import Link from "next/link";
import { type FaqItem, GuideFaq } from "@/components/guide-faq";
import { GuideLayout } from "@/components/guide-layout";
import { guide } from "@/lib/guides";
import { guidePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { TAGLINE_CHECKER } from "@/lib/tools";

const g = guide("how-to-write-a-product-hunt-tagline");

export const metadata: Metadata = pageMetadata(guidePage(g));

const SRC = {
  launchGuide: "https://help.producthunt.com/en/articles/17350772-launch-guide",
  howToPost: "https://help.producthunt.com/en/articles/479557-how-to-post-a-product",
  preparing: "https://www.producthunt.com/launch/preparing-for-launch",
} as const;

const FORMULAS = [
  {
    pattern: "[Verb] your [thing] [how or when]",
    example: "Back up your Notion workspace to GitHub every night",
    when: "Use it when one action is the whole product. The verb does the work, so pick a precise one: back up, find, merge, translate.",
  },
  {
    pattern: "[Input] to [output]",
    example: "Figma frames to clean React components",
    when: "Use it when your users already have the input. People see their own file or data on the left and the result they want on the right.",
  },
  {
    pattern: "[Familiar category] for [narrow audience]",
    example: "Invoicing for freelance translators",
    when: "Use it when the category is well understood and your edge is fitting one group closely. It falls apart with wide audiences like “teams” or “creators”.",
  },
  {
    pattern: "[Job] by [familiar action]",
    example: "Plan a week of meals by dragging recipes onto a calendar",
    when: "Use it when the interaction is the new part. Naming a gesture people already know makes an unfamiliar product feel easy.",
  },
  {
    pattern: "[Output] written from your [existing source]",
    example: "API docs written from your OpenAPI file",
    when: "Use it when the product removes manual work by reusing something people already maintain. It answers “where does the content come from?” before anyone asks.",
  },
  {
    pattern: "[Category] with [the constraint people want]",
    example: "A habit tracker with no account and no cloud",
    when: "Use it when the constraint is the reason to switch: offline, open source, self-hosted, no account. It works best in crowded categories.",
  },
] as const;

const EXAMPLES = [
  { weak: "Next-gen invoicing for the modern freelancer", better: "Invoices that chase late payments for you", why: "“Next-gen” and “modern” are filler. The better line names the painful part of invoicing and says the product handles it." },
  { weak: "Your all-in-one workspace", better: "Docs, tasks and a wiki behind one search box", why: "“All-in-one” never says which things. Name the ones that matter, or lead with the main one." },
  { weak: "Built with Next.js, Supabase and GPT", better: "Turn bank CSV exports into a monthly budget", why: "Your stack matters to you, and makes a good detail for your maker comment. People scanning the feed want to know what the product does for them." },
  { weak: "Tired of messy meeting notes?", better: "Action items pulled from your meeting recordings", why: "A question makes the reader do the work. Answer it instead." },
  { weak: "The Uber for dog walking", better: "Find a dog walker who lives on your street", why: "“X for Y” borrows another company's story and leaves out what makes yours different. Say the job directly." },
  { weak: "Supercharge your workflow with AI", better: "Draft replies to support tickets from your help docs", why: "Every word of the weak line could describe thousands of products. The better one names the input, the output and the user." },
  { weak: "The fastest database GUI ever made", better: "A keyboard-first database GUI for Postgres and SQLite", why: "A superlative is a claim you can't prove in one line, and Product Hunt asks for no over-the-top language. A concrete trait is easier to believe." },
] as const;

const FAQ: FaqItem[] = [
  {
    q: "How many characters can a Product Hunt tagline have?",
    a: "60, including spaces. Product Hunt's Launch Guide and its launch preparation page both give 60 characters as the maximum. You don't have to use all of them: a short line people read in one glance is usually stronger.",
  },
  {
    q: "What is the difference between a Product Hunt tagline and the description?",
    a: "The tagline is one line of up to 60 characters that sits under your product name in the feed and earns the click. The description, up to 260 characters according to Product Hunt's Launch Guide and help center, is the next level of detail on your launch page: the problem, how the product works and what makes it different.",
  },
  {
    q: "Should I mention AI in my Product Hunt tagline?",
    a: "Only if it tells people something they need to know. Product Hunt asks for plain language without gimmicks, and “AI” on its own describes how a product is built, not what it does for someone. Name the job in the tagline and explain the AI part in the description if it matters.",
  },
  {
    q: "Can I use a formula like “Uber for X”?",
    a: "It is better to avoid it. “X for Y” leans on another company's story and only works if the reader knows that company and sees the link straight away. Saying the job directly, such as “Find a dog walker who lives on your street”, is clearer.",
  },
  {
    q: "Can LaunchLoop write my Product Hunt tagline?",
    a: "Yes. Generate mode in the free tagline checker writes three options from your GitHub repo or live site, and the free LaunchLoop preview includes a tagline too. Check each option against the formulas and mistakes in this guide before you pick one.",
  },
];

export default function ProductHuntTaglineGuidePage() {
  return (
    <GuideLayout guide={g}>
      <p>
        Your Product Hunt tagline is one line of up to 60 characters, and it does more work than anything else on the listing. Product Hunt&apos;s own{" "}
        <a href={SRC.preparing}>launch preparation page</a> calls it &ldquo;typically the main element that drives someone to click on a product from the homepage&rdquo;. This
        guide is about writing one: a process, six formulas, examples, the mistakes to avoid, and how the tagline fits with the rest of your launch. Already have a tagline?
        Paste it into the free <Link href={TAGLINE_CHECKER.path}>Product Hunt tagline checker</Link> for a live count and a checklist.
      </p>

      <h2 id="what-product-hunt-asks-for">What Product Hunt asks for</h2>
      <ul>
        <li>
          <strong>60 characters at most.</strong> Both the <a href={SRC.launchGuide}>Launch Guide</a> and the <a href={SRC.preparing}>launch preparation page</a> give the same
          limit.
        </li>
        <li>
          <strong>A very short description, with no gimmicks or over-the-top language.</strong> Product Hunt&apos;s good example is &ldquo;Send your friends a voicemail meow
          from a real cat.&rdquo; Its not-allowed example is &ldquo;The most ameozing app in the app store&rdquo;.
        </li>
        <li>
          <strong>The name field takes only the name.</strong> No description or emoji unless they are part of the name, according to the{" "}
          <a href={SRC.howToPost}>help center</a>. So the tagline is where the description goes.
        </li>
        <li>
          <strong>Plain words.</strong> The Launch Guide asks makers to skip the marketing gloss and &ldquo;say what the product does so someone gets it on the first
          read&rdquo;, with the Mom test as the bar.
        </li>
      </ul>
      <p>
        The checker&apos;s <Link href={`${TAGLINE_CHECKER.path}#rules`}>rules section</Link> covers the mechanical checks. The rest of this page is about the writing.
      </p>

      <h2 id="brief">Start from a one-sentence brief</h2>
      <p>Most weak taglines come from writing the tagline first. Write down three facts before you write any tagline:</p>
      <ol>
        <li><strong>Who it is for</strong>, as specifically as you can honestly say. &ldquo;Shopify store owners&rdquo; beats &ldquo;businesses&rdquo;.</li>
        <li><strong>The job it does for them</strong>, as a verb and an object: &ldquo;find duplicate orders&rdquo;, &ldquo;turn a CSV into a dashboard&rdquo;.</li>
        <li><strong>What is different</strong>: the input it takes, the step it removes, or the constraint it works under, such as offline, open source or no account.</li>
      </ol>
      <p>
        Then write ten versions without editing, and only then start cutting. Read the best three aloud and keep the one a stranger could repeat back to you. If you built
        your app with an AI builder, write the brief from what the app actually does, not from the prompt you gave it; <Link href="/how-to-launch-a-vibe-coded-app">how to
        launch a vibe-coded app</Link> explains why.
      </p>

      <h2 id="formulas">Six formulas that work</h2>
      <p>
        The checker page already covers <strong>[Outcome] for [who]</strong> and <strong>[Action] without [pain]</strong>. Here are six more. Treat them as starting points,
        not templates. Each example is for a made-up product and fits in 60 characters.
      </p>
      {FORMULAS.map((f) => (
        <div key={f.pattern}>
          <h3>{f.pattern}</h3>
          <p className="mt-2">
            <strong className="text-foreground">Example:</strong> &ldquo;{f.example}&rdquo;. {f.when}
          </p>
        </div>
      ))}

      <h2 id="examples">Good vs weak tagline examples</h2>
      <p>Every line below fits the 60-character limit, and every product is made up. The weak versions are the kind of line that gets written in the submit form at the last minute.</p>
      <div className="grid gap-3" data-testid="tagline-guide-examples">
        {EXAMPLES.map((ex) => (
          <div key={ex.better} className="rounded-xl border border-border bg-card p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="text-sm">
                <span className="block text-xs font-medium uppercase tracking-wide text-destructive">Weak</span>
                {ex.weak}
              </p>
              <p className="text-sm">
                <span className="block text-xs font-medium uppercase tracking-wide text-emerald-700">Better</span>
                <span className="font-medium text-foreground">{ex.better}</span>
              </p>
            </div>
            <p className="mt-2 text-sm">{ex.why}</p>
          </div>
        ))}
      </div>

      <h2 id="mistakes">Common mistakes</h2>
      <p>
        The <Link href={TAGLINE_CHECKER.path}>tagline checker</Link> flags the mechanical problems as you type: going over 60 characters, a trailing full stop, all caps, emoji,
        hype words and repeating the product name. These are the ones a checker can&apos;t catch:
      </p>
      <ul>
        <li><strong>Describing the technology instead of the result.</strong> Model names and frameworks belong in the maker comment.</li>
        <li><strong>Writing for investors.</strong> &ldquo;The operating system for&rdquo; and &ldquo;reimagining&rdquo; describe ambition, not a product someone can use today.</li>
        <li><strong>Insider words.</strong> Your internal feature names and acronyms mean nothing to someone scrolling the homepage.</li>
        <li><strong>A feature list.</strong> &ldquo;Notes, tasks, calendar, chat and docs&rdquo; gives the reader five things to forget. Lead with one.</li>
        <li><strong>A slogan that needs context.</strong> A pun that only lands once you know the product won&apos;t earn the click that would give people the context.</li>
        <li><strong>Claims you can&apos;t back up.</strong> &ldquo;#1&rdquo;, &ldquo;fastest&rdquo; and &ldquo;best&rdquo; invite doubt, and break Product Hunt&apos;s no over-the-top language rule.</li>
        <li><strong>An audience of everyone.</strong> &ldquo;For teams&rdquo; or &ldquo;for creators&rdquo; tells nobody it is for them.</li>
        <li><strong>Repeating the tagline in the description.</strong> You have 60 characters plus 260 more. Don&apos;t spend the second allowance saying the same thing.</li>
      </ul>

      <h2 id="listing">How the tagline works with the rest of the listing</h2>
      <p>People meet your launch in stages, and each field has its own job. Make them add to each other rather than repeat each other.</p>
      <ul>
        <li><strong>Name:</strong> just the name, per Product Hunt&apos;s rules. It tells people what to call you, nothing more.</li>
        <li>
          <strong>Thumbnail:</strong> the square image next to your name and tagline in the feed. The <a href={SRC.howToPost}>help center</a> recommends 240×240. Together, name,
          thumbnail and tagline are everything people see before they click.
        </li>
        <li><strong>Tagline:</strong> what it does, and for whom. Its one job is the click.</li>
        <li>
          <strong>Description:</strong> the next level of detail on your launch page. The Launch Guide and help center cap it at 260 characters (the older launch preparation page
          still says 500, so write to 260). Cover the problem, how the product works and one detail only you can claim.
        </li>
        <li>
          <strong>Gallery:</strong> at least two images, with 1270×760 recommended, according to the help center. Make the first image show the tagline&apos;s promise
          happening. If the tagline says &ldquo;CSV to dashboard&rdquo;, image one is a CSV becoming a dashboard.
        </li>
        <li>
          <strong>First comment:</strong> the story. The <a href={SRC.launchGuide}>Launch Guide</a> calls it the Maker comment, says it sets the tone for the whole conversation,
          and suggests covering your product, your team, what makes it unique and the story behind the build.
        </li>
      </ul>
      <h3>A worked example</h3>
      <p>Here is how the fields fit together for a made-up product:</p>
      <ul>
        <li><strong>Name:</strong> Gridcast</li>
        <li><strong>Tagline:</strong> Turn a CSV into a dashboard you can share by link</li>
        <li>
          <strong>Description:</strong> Drop in a CSV or paste a Google Sheets link. Gridcast picks a chart for each column and gives you a dashboard at a public or
          password-protected link. No SQL and no setup, and nothing leaves your browser until you publish.
        </li>
        <li><strong>First gallery image:</strong> a spreadsheet on the left, the finished dashboard on the right.</li>
        <li><strong>First comment:</strong> why it was built (tired of pasting spreadsheet screenshots into Slack), what is free, and the feedback the maker wants.</li>
      </ul>
      <p>
        The tagline promises the outcome, the description explains how, the image proves it, and the comment makes it personal. None of them repeats another.
      </p>

      <h2 id="testing">Test it before launch day</h2>
      <ul>
        <li><strong>Try the Mom test</strong> the Launch Guide suggests. Read the tagline to someone outside tech and ask what the product does. If they can&apos;t say, rewrite it.</li>
        <li><strong>Cover the name and thumbnail.</strong> The tagline should still make sense on its own.</li>
        <li><strong>Read it next to today&apos;s Product Hunt homepage.</strong> Would yours stand out, or blend in with the lines around it?</li>
        <li><strong>Run it through the <Link href={TAGLINE_CHECKER.path}>tagline checker</Link></strong> for the length and the mechanical checks.</li>
        <li><strong>Reuse it.</strong> A good tagline also works as your landing page subheadline, your Open Graph title and your X bio. If it doesn&apos;t fit there, it probably isn&apos;t clear enough yet.</li>
      </ul>

      <h2 id="next">Next steps</h2>
      <p>
        With the tagline settled, the rest of the launch gets easier. The <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link> covers timing,
        images and launch-day steps. Launching on Hacker News too? It works differently, so follow the <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link>.
      </p>
      <p>
        LaunchLoop reads your repo and live site and drafts your tagline, description, maker comment, X thread, LinkedIn post and launch images, all inside each
        platform&apos;s limits. The <Link href="/#start">free preview</Link> includes the tagline; see <Link href="/pricing">pricing</Link> for the full kit.
      </p>

      <GuideFaq guide={g} title="Tagline writing FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <ul>
        <li><a href={SRC.launchGuide}>Launch Guide</a>, Product Hunt Help Center</li>
        <li><a href={SRC.howToPost}>How to post a product</a>, Product Hunt Help Center</li>
        <li><a href={SRC.preparing}>Preparing for launch</a>, Product Hunt</li>
      </ul>
    </GuideLayout>
  );
}
