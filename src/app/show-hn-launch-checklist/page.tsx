import type { Metadata } from "next";
import Link from "next/link";
import { type FaqItem, GuideFaq } from "@/components/guide-faq";
import { GuideLayout } from "@/components/guide-layout";
import { guide } from "@/lib/guides";
import { guidePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { OG_PREVIEW, SHOW_HN_CHECKER } from "@/lib/tools";

const g = guide("show-hn-launch-checklist");

export const metadata: Metadata = pageMetadata(guidePage(g));

const SRC = {
  showHn: "https://news.ycombinator.com/showhn.html",
  guidelines: "https://news.ycombinator.com/newsguidelines.html",
  faq: "https://news.ycombinator.com/newsfaq.html",
  tips: "https://news.ycombinator.com/item?id=22336638",
  ringDetector: "https://news.ycombinator.com/item?id=47458525",
  secondChance: "https://news.ycombinator.com/item?id=26998308",
  shownew: "https://news.ycombinator.com/shownew",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "Can I post a landing page or a waitlist as a Show HN?",
    a: "No. The Show HN guidelines rule out sign-up pages, landing pages and fundraisers, along with blog posts, newsletters and lists. Show HN is for something people can try now. If it isn't ready to try, wait until it is.",
  },
  {
    q: "Can I ask friends to upvote my Show HN?",
    a: "No. The Show HN guidelines, the main HN guidelines and the HN FAQ all say not to ask for upvotes or comments, and the FAQ says HN penalises or bans submissions, accounts and sites that do. HN also runs an automatic voting ring detector whose rules are not published.",
  },
  {
    q: "Can I use ChatGPT or another AI tool to write my Show HN post?",
    a: "HN asks you not to. The Show HN tips from HN moderator dang say to write your text by hand and not use an LLM to generate or edit any of it, and the HN guidelines ask people not to post generated or AI-edited text. Building the product with AI tools is fine; the words you post should be your own.",
  },
  {
    q: "Does my Show HN have to work without a sign-up?",
    a: "It isn't a hard rule, but the guidelines ask you to make it easy to try, ideally without sign-ups or emails, and say you will get more feedback that way. A demo mode, sample data or a guest session is usually enough.",
  },
  {
    q: "What if my Show HN gets no attention?",
    a: "Don't delete it and post it again. The HN FAQ allows a small number of reposts if a story hasn't had significant attention in the last year or so. Moderators also run a second-chance pool for overlooked posts and sometimes email submitters an invitation to repost, so add an email address to your HN profile.",
  },
];

export default function ShowHnChecklistPage() {
  return (
    <GuideLayout guide={g}>
      <p>
        Show HN is the part of Hacker News where people share things they have built. It has its own rules, a community that has little patience for marketing, and
        moderators who enforce both. This checklist takes you from &ldquo;is my project eligible?&rdquo; to the week after, with every rule linked to its source on Hacker
        News.
      </p>

      <h2 id="what-is-show-hn">What Show HN is, and what it is not</h2>
      <p>
        The official <a href={SRC.showHn}>Show HN guidelines</a> are short, so read them in full before you post. In summary:
      </p>
      <ul>
        <li><strong>It is for something you made that people can play with.</strong> Readers try it, give feedback and ask questions in the thread.</li>
        <li><strong>On topic:</strong> things people can run on their computers or hold in their hands. For hardware, a video or a detailed write-up is fine. For a book, a sample chapter.</li>
        <li><strong>Off topic:</strong> blog posts, sign-up pages, newsletters, lists and other reading material, plus landing pages and fundraisers. If people can&apos;t try it yet, come back when they can.</li>
        <li><strong>It has to be your own work</strong>, and you have to be around to discuss it.</li>
        <li><strong>It should be non-trivial.</strong> The guidelines say not to post quickly generated one-offs, because anybody can make those now. Share something personal and interesting to you, and explain how and why you built it.</li>
        <li><strong>It doesn&apos;t need to look slick.</strong> The community is comfortable with early-stage work.</li>
        <li><strong>Upgrades usually don&apos;t count.</strong> &ldquo;Foo 1.3.1 is out&rdquo; generally isn&apos;t substantive enough. A major overhaul probably is.</li>
        <li><strong>Don&apos;t ask friends to upvote or comment.</strong> More on this below, because breaking it gets posts penalised.</li>
      </ul>
      <p>
        If you built your app with Cursor, Lovable, Bolt or v0, the &ldquo;non-trivial&rdquo; line is the one to think hardest about. If the honest story is &ldquo;I prompted
        this in an afternoon&rdquo;, it is probably not ready for Show HN. If you spent real time on a real problem and AI tools helped, say what the problem was and what you
        learned building it.
      </p>

      <h2 id="before-you-post">Before you post</h2>
      <ul>
        <li><strong>Try it as a stranger.</strong> Open it in a private window, on a phone and on a laptop. Fix anything that blocks someone in the first minute.</li>
        <li><strong>Remove the sign-up wall for the first try.</strong> See <a href="#easy-to-try">make it easy to try</a> below.</li>
        <li><strong>Check it can take a spike.</strong> Rate limits, database connection limits, paid API quotas and free-tier hosts that sleep are the usual failure points.</li>
        <li><strong>Turn on error tracking and analytics</strong>, so you can see what breaks while the thread is live.</li>
        <li>
          <strong>Check your link preview.</strong> Hacker News shows a plain text link, but readers paste good finds into Slack, X and group chats. Test the card with the free{" "}
          <Link href={OG_PREVIEW.path}>OG image preview</Link>.
        </li>
        <li><strong>Add an email address to your HN profile.</strong> The <a href={SRC.tips}>Show HN tips</a> ask for this so moderators can contact you, and sometimes send repost invites.</li>
        <li>
          <strong>Post as a person, not a brand.</strong> The same tips advise against a username that is your company or project name, because it feels like promotion. You can
          email hn@ycombinator.com to change it.
        </li>
      </ul>

      <h2 id="title">Write the title</h2>
      <p>
        The rule is simple: submit a story whose title begins with &ldquo;Show HN&rdquo;. After that, the general <a href={SRC.guidelines}>HN guidelines</a> apply: no
        uppercase or exclamation marks to make it stand out, no saying how great it is, and nothing misleading or linkbait.
      </p>
      <p>
        A format that works is <strong>Show HN: [Name], [what it does in plain words]</strong>, or just <strong>Show HN: [what it does]</strong> if the name adds nothing. For
        real examples from HN, weak and stronger titles, and whether to make it a link or a text post, read{" "}
        <Link href="/how-to-write-a-show-hn-post">how to write a Show HN post</Link>.
      </p>
      <p>
        To test a title as you type, paste it into the free <Link href={SHOW_HN_CHECKER.path}>Show HN title checker</Link>. It checks the title and your text against these
        written rules and quotes the HN sentence behind each check.
      </p>

      <h2 id="first-comment">Write the maker&apos;s first comment</h2>
      <p>
        When you submit, you can add text. According to the <a href={SRC.tips}>Show HN tips</a> from HN moderator dang, linked from the guidelines, it should show at the top of
        the submission. If it doesn&apos;t, post it as the first comment; either is fine. Those tips ask for:
      </p>
      <ul>
        <li><strong>A clear statement of what the project is or does.</strong> Without one, the thread fills up with &ldquo;I can&apos;t tell what this is&rdquo;.</li>
        <li><strong>The backstory:</strong> how you came to work on it.</li>
        <li><strong>What is different about it</strong> compared with what already exists.</li>
        <li><strong>Personal stories and technical details.</strong> How it works, what it is built with, the trade-offs you made.</li>
        <li><strong>Links to earlier HN threads</strong> that are relevant. Readers like those.</li>
        <li><strong>No marketing or sales language.</strong> The tips call it an instant turnoff on HN. Use factual, direct language.</li>
      </ul>
      <p>
        <Link href="/how-to-write-a-show-hn-post#text">How to write a Show HN post</Link> turns those tips into an outline, with what HN moderators said in 2026 about the
        details readers look for.
      </p>
      <p>
        <strong>Write it by hand.</strong> In 2026 the tips gained a new first item: don&apos;t use an LLM to generate any of your text, not even to edit or polish it. The HN
        guidelines also ask people not to post generated or AI-edited text, and that covers your replies in the thread too. LaunchLoop drafts Product Hunt, X and LinkedIn copy;
        it doesn&apos;t write Show HN posts, and neither should any other AI tool.
      </p>

      <h2 id="easy-to-try">Make it easy to try</h2>
      <p>
        The guidelines ask you to make your project easy to try, ideally without barriers such as sign-ups or emails, because you will get more feedback that way. The tips add
        that HN users get ornery if you make them jump through hoops. Ways to do it:
      </p>
      <ul>
        <li><strong>A demo mode or sample data</strong> that loads without an account.</li>
        <li><strong>A guest session</strong> that only asks for an email when someone wants to save their work.</li>
        <li><strong>For CLIs and libraries:</strong> a one-line install and a copy-paste example at the top of the README.</li>
        <li><strong>For things that can&apos;t run in a browser:</strong> a short video or a detailed write-up with photos, which the guidelines accept for hardware.</li>
        <li><strong>Visible pricing.</strong> If there is a paid plan, show the price without making people sign up to find it.</li>
        <li><strong>If you really need accounts</strong>, say so in your text and explain why.</li>
      </ul>

      <h2 id="timing">Pick a time</h2>
      <p>
        Hacker News doesn&apos;t publish a best time to post. What the <a href={SRC.faq}>HN FAQ</a> does explain is ranking: points divided by a power of the time since
        submission, plus other factors such as user flags, anti-abuse software and moderator action. Every Show HN appears on <a href={SRC.shownew}>/shownew</a>, and moves to the Show page
        once it clears a small points threshold.
      </p>
      <ul>
        <li><strong>Post when you can stay for several hours.</strong> The guidelines require you to be around to discuss it, and early questions deserve quick answers.</li>
        <li><strong>Avoid days you are travelling, shipping something else or stuck in meetings.</strong></li>
        <li><strong>Don&apos;t delete and repost</strong> if it starts slowly. The guidelines ask you not to, and there are better options (see <a href="#after">after the launch</a>).</li>
      </ul>

      <h2 id="replies">Reply to comments</h2>
      <p>
        The comments are the point of a Show HN. The guidelines ask commenters to be respectful and curious and to suggest alternatives rather than say &ldquo;you&apos;re doing
        it wrong&rdquo;. Hold yourself to the same standard:
      </p>
      <ul>
        <li><strong>Answer questions specifically.</strong> Give the real detail. If you don&apos;t know, say so.</li>
        <li><strong>Thank people for criticism</strong>, even blunt criticism, and say what you will do about it. Don&apos;t argue or get defensive.</li>
        <li><strong>Read comments generously.</strong> The HN guidelines ask everyone to respond to the strongest plausible interpretation of what someone says.</li>
        <li><strong>Fix bugs live.</strong> When someone reports one, fix it and reply in the thread when the fix is out.</li>
        <li><strong>Be upfront about limits and trade-offs.</strong> It is more convincing than any claim.</li>
        <li><strong>Don&apos;t comment on the voting on comments</strong> or hint that critics are astroturfing. Both are against the guidelines.</li>
      </ul>
      <p>
        Your replies have to be your own words too: see <Link href="/how-to-write-a-show-hn-post#replies">replying to comments</Link> in the Show HN writing guide.
      </p>

      <h2 id="voting">Never ask for upvotes or comments</h2>
      <p>
        The Show HN guidelines say not to ask friends to upvote or comment. The <a href={SRC.guidelines}>HN guidelines</a> say not to solicit upvotes, comments or submissions.
        The <a href={SRC.faq}>FAQ</a> says HN penalises or bans submissions, accounts and sites that break this rule, and that readers will detect requested comments, flag
        them and call them spam.
      </p>
      <p>
        Enforcement is largely automatic. HN runs a voting ring detector, and dang has <a href={SRC.ringDetector}>said</a> they don&apos;t publish how it works,
        because it would quickly stop working, and that the penalty it applies is a software penalty that has nothing to do with the content of the story. The FAQ also notes
        that some votes are dropped by anti-abuse software. In practice:
      </p>
      <ul>
        <li>Don&apos;t drop the HN link into Slack, Discord, WhatsApp groups or your newsletter asking people to upvote, comment or &ldquo;show some love&rdquo;.</li>
        <li>Don&apos;t ask teammates, friends or users for booster comments. The tips say HN users are adept at spotting them, consider them spam and will flame you for it.</li>
        <li>Don&apos;t buy votes or join vote-swap groups.</li>
        <li>Do keep sharing your product itself (your site, not the HN thread) wherever you normally would.</li>
      </ul>

      <h2 id="after">After the launch</h2>
      <ul>
        <li><strong>Keep answering.</strong> The FAQ says threads close to new comments after two weeks, so late questions can still get a reply.</li>
        <li><strong>Ship fixes from the feedback</strong> and reply in the thread when they are live.</li>
        <li>
          <strong>If it didn&apos;t get attention:</strong> the FAQ allows a small number of reposts if a story hasn&apos;t had significant attention in the last year or so.
          Moderators also run a <a href={SRC.secondChance}>second-chance pool</a> that puts overlooked submissions back on the front page, and sometimes invite submitters to
          repost. That is why the email address in your profile matters.
        </li>
        <li>
          <strong>Your next Show HN:</strong> only for a new version that is significantly different. The tips suggest once or twice a year at most, with a comment linking the
          previous Show HN and explaining what changed.
        </li>
        <li><strong>Turn the best questions into FAQ entries and landing page copy.</strong> The questions people asked are the objections your landing page needs to answer.</li>
      </ul>

      <h2 id="other-channels">Launching on Product Hunt as well?</h2>
      <p>
        Hacker News and Product Hunt reward different things. Product Hunt wants a polished listing with a 60-character tagline and gallery images: follow the{" "}
        <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link> and read <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt
        tagline</Link>. Both sites ban asking for upvotes. If you built with an AI builder, <Link href="/how-to-launch-a-vibe-coded-app">how to launch a vibe-coded app</Link>{" "}
        covers the pre-launch fixes those tools tend to skip. Sharing it on Reddit as well? Subreddits set their own self-promotion rules, so read{" "}
        <Link href="/how-to-promote-on-reddit">how to promote your app on Reddit</Link> first.
      </p>
      <p>
        LaunchLoop drafts your landing copy, Product Hunt post, X thread, LinkedIn post and launch images from your repo, so you can spend launch day in the HN thread. Your
        Show HN text should still come from you. Start with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <GuideFaq guide={g} title="Show HN FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <ul>
        <li><a href={SRC.showHn}>Show HN guidelines</a>, Hacker News</li>
        <li><a href={SRC.guidelines}>Hacker News guidelines</a></li>
        <li><a href={SRC.faq}>Hacker News FAQ</a></li>
        <li><a href={SRC.tips}>Tips for presenting a Show HN</a>, by HN moderator dang, linked from the Show HN guidelines</li>
        <li><a href={SRC.ringDetector}>dang on HN&apos;s voting ring detector</a> (March 2026)</li>
        <li><a href={SRC.secondChance}>dang on HN&apos;s second-chance pool</a></li>
      </ul>
    </GuideLayout>
  );
}
