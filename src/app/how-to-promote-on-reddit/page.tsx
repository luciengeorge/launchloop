import type { Metadata } from "next";
import Link from "next/link";
import { type FaqItem, GuideFaq } from "@/components/guide-faq";
import { GuideLayout } from "@/components/guide-layout";
import { guide } from "@/lib/guides";
import { guidePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { OG_PREVIEW } from "@/lib/tools";

const g = guide("how-to-promote-on-reddit");

export const metadata: Metadata = pageMetadata(guidePage(g));

const SRC = {
  redditRules: "https://redditinc.com/policies/reddit-rules",
  spam: "https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam",
  disrupting: "https://support.reddithelp.com/hc/en-us/articles/360043066412-Disrupting-Communities",
  enforcement: "https://support.reddithelp.com/hc/en-us/articles/23511059871252-Content-Moderation-Enforcement-and-Appeals",
  selfPromotionWiki: "https://www.reddit.com/wiki/selfpromotion/",
  tenPercent: "https://www.reddit.com/r/modnews/comments/2oamgp/moderators_clarifications_around_our_101/",
  startupsRules: "https://www.reddit.com/r/startups/about/rules/",
  webdevRules: "https://www.reddit.com/r/webdev/about/rules/",
  indieHackersRules: "https://www.reddit.com/r/indiehackers/about/rules/",
  indieHackersSub: "https://www.reddit.com/r/indiehackers/comments/1uzsfzy/community_reorganisation_new_posting_guidelines/",
  languageLearning: "https://www.reddit.com/r/languagelearning/wiki/rules_for_promotion/",
  ihTips: "https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd",
  hnGuidelines: "https://news.ycombinator.com/newsguidelines.html",
  showHnTips: "https://news.ycombinator.com/item?id=22336638",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "Is self-promotion allowed on Reddit?",
    a: "Reddit's sitewide rules don't ban it. They ban spam and content manipulation, and they ask you to follow each community's rules. Reddit's spam policy says that if your contributions are mostly links to a business you run, you should be thoughtful about how often you post or use Reddit ads instead. Each subreddit then decides for itself: some ban promotion, some allow it in a pinned thread or on a set day, and some ask you to message the moderators first.",
  },
  {
    q: "What is the 10% rule on Reddit?",
    a: "It is an old rule of thumb from Reddit's self-promotion guide, which said 10% or less of your posting and conversation should link to your own content. In 2014 Reddit's admins clarified it as nine posts or comments without self-promotion for every one with it, and said going over 10% doesn't automatically make someone a spammer. That guide is no longer updated and today's spam policy gives no number, but some subreddits still point to the 9:1 rule in their own rules.",
  },
  {
    q: "Can I promote my app on Reddit from a new account?",
    a: "You can try, but expect it to fail. Reddit's rules ask you to take part in communities where you have a personal interest, and some subreddits restrict new accounts: r/indiehackers, for example, says new accounts have to wait and can only ask questions through modmail. Post from your own account, with a history of comments that have nothing to do with your product, and say that you built the thing you are sharing.",
  },
  {
    q: "Can I post my launch in several subreddits at once?",
    a: "Not with the same text. Reddit's spam policy lists mass-posting repetitive content for exposure or financial gain as spam. Pick two or three communities where your users already spend time, write a post for each one that follows its rules, and post them over several days so you can stay in each thread.",
  },
  {
    q: "Can I use ChatGPT or another AI tool to write my Reddit post?",
    a: "Write it yourself. Reddit's spam policy names generative AI tools among the tools that can spread spam, and readers spot generic launch copy quickly. If you are posting a Show HN the same week, the Hacker News guidelines ask you not to post generated text, and the Show HN tips from HN moderator dang say not to use an LLM to write or even edit your post.",
  },
  {
    q: "Should I pay for Reddit ads instead?",
    a: "If you want to post a pitch, ads are the route Reddit itself points to: its spam policy suggests its self-serve ads platform for people whose contributions are mostly links to their own business. Organic posts work best when they are useful on their own, and you can do both: ads for reach, and honest posts and comments in the communities you already belong to.",
  },
];

export default function RedditPromotionPage() {
  return (
    <GuideLayout guide={g}>
      <p>
        Reddit is where people ask for recommendations, compare tools and complain about the ones they use. It is also where a careless launch post gets
        removed and an account can be banned for good. Reddit doesn&apos;t ban self-promotion outright: it bans spam, vote manipulation and accounts that only exist to
        sell. This guide covers what Reddit&apos;s own rules say, how subreddit rules differ, and how to write a post that stays up, with every rule linked to its source.
      </p>

      <h2 id="reddit-rules">What Reddit&apos;s own rules say</h2>
      <p>
        Reddit has two layers of rules. The sitewide <a href={SRC.redditRules}>Reddit Rules</a> are enforced by Reddit&apos;s staff (admins). On top of those, every subreddit
        has its own rules, enforced by its volunteer moderators. The sitewide rules that matter for founders:
      </p>
      <ul>
        <li>
          <strong>Rule 2:</strong> abide by community rules, participate authentically in communities where you have a personal interest, and don&apos;t spam or disrupt
          communities, including through content manipulation.
        </li>
        <li><strong>Rule 5:</strong> be authentic. You don&apos;t have to use your real name, but don&apos;t mislead people or impersonate anyone.</li>
        <li>
          <strong>The <a href={SRC.spam}>spam policy</a>:</strong> spam is repeated or unsolicited actions, automated or manual, that harm users or communities. Its examples
          include mass-posting repetitive content for exposure or financial gain, sending lots of unsolicited private or chat messages, and using tools such as bots or
          generative AI to spread spam.
        </li>
        <li>
          <strong>The <a href={SRC.disrupting}>disrupting communities policy</a>:</strong> no vote manipulation, whether through multiple accounts, voting services, automation or
          an organised group voting together, and no new accounts to get around a ban.
        </li>
      </ul>
      <p>
        The spam policy also gives direct advice to anyone running a business: if your contributions are mostly links to a business you run, own or benefit from, be thoughtful
        about how often you post, or use Reddit&apos;s self-serve ads. It adds that moderators decide what counts as spam in their own communities, and suggests messaging them if
        you are unsure.
      </p>
      <p>
        Enforcement escalates. Reddit&apos;s page on <a href={SRC.enforcement}>enforcement and appeals</a> says it can remove content, warn you, ban an account for three days,
        then seven days, then permanently, depending on how serious the violation is and your history. Some violations lead straight to a permanent ban. Subreddit moderators
        can also ban you from their community, separately from anything Reddit does.
      </p>

      <h2 id="ten-percent">The 10% rule, and where it came from</h2>
      <p>
        A lot of Reddit marketing advice mentions the &ldquo;10% rule&rdquo; or &ldquo;9:1 rule&rdquo;. It comes from Reddit&apos;s old{" "}
        <a href={SRC.selfPromotionWiki}>self-promotion guide</a>, now marked as no longer updated, which gave a rule of thumb: 10% or less of your posting and conversation
        should link to your own content. In 2014 Reddit&apos;s admins <a href={SRC.tenPercent}>clarified it</a> as nine posts or comments without self-promotion for every one
        with it, and said that going over 10% doesn&apos;t automatically make someone a spammer.
      </p>
      <p>
        Today&apos;s spam policy gives no number, but the idea survives in subreddit rules: r/webdev, for example, points people to the Reddit 9:1 rule. Treat it as a floor,
        not a target. The same old guide put the principle better than any ratio: it&apos;s fine to be a redditor with a website, not a website with a Reddit account.
      </p>

      <h2 id="subreddit-rules">Every subreddit sets its own rules</h2>
      <p>
        The rules that remove most launch posts are the subreddit&apos;s, not Reddit&apos;s. They are in the sidebar on desktop or the About tab in the app, sometimes with more
        detail in the wiki or a pinned post. The common patterns:
      </p>
      <ul>
        <li><strong>No promotion at all.</strong> Read along, answer questions, and don&apos;t mention your product.</li>
        <li><strong>A pinned thread only.</strong> A weekly or monthly thread is the one place to share what you built.</li>
        <li><strong>A set day and flair.</strong> Project posts are allowed on one day of the week, tagged with the right flair.</li>
        <li><strong>A flair for promotion.</strong> You may post your product, but only marked as self-promotion.</li>
        <li><strong>Moderator approval first.</strong> You send your post to the moderators and wait for a yes.</li>
      </ul>
      <p>Some examples, as of mid-2026. Rules change, so read the current version before you post:</p>
      <ul>
        <li>
          <strong>r/startups:</strong> the <a href={SRC.startupsRules}>rules</a> ban direct sales, advertisements and promotional posts, with exceptions only in stickied
          threads. You may share your startup in the Share Your Startup thread stickied at the top of the subreddit (the rules call it monthly). The rules count anything you
          have an
          interest, stake or relationship with as self-promotion, including a friend&apos;s company.
        </li>
        <li>
          <strong>r/webdev:</strong> the <a href={SRC.webdevRules}>rules</a> ban commercial promotion and limit sharing a project or asking for feedback to Showoff Saturday,
          with the matching flair. Posts on other days are removed. Even on Showoff Saturday a commercial product isn&apos;t allowed: the rules say &ldquo;Commercial promotion
          still falls under rule #4 and is not allowed. Think project, not product&rdquo;, and rule 4 violations can lead to a ban.
        </li>
        <li>
          <strong>r/indiehackers:</strong> rule 1 of the <a href={SRC.indieHackersRules}>rules</a> allows one promotional post per product: &ldquo;Users can self promote their
          product 1 time using the Self Promotion flair.&rdquo; It goes on: &ldquo;The purpose is for feedback and critique not advertisement.&rdquo; Rule 2 says posts with MRR info should have
          proof: &ldquo;no proof, no post&rdquo;. A <a href={SRC.indieHackersSub}>moderator post</a> adds no fake questions to boost a product, zero tolerance for vote manipulation, and that new
          accounts have to wait and can only ask questions through modmail.
        </li>
        <li>
          <strong>Niche communities can be stricter still.</strong> r/languagelearning, where many language apps would like to post, made all self-promotion permission-only
          outside one thread, and its <a href={SRC.languageLearning}>rules for promotion</a> warn that the usual playbook of making an account, adding the odd comment and then
          slipping your product into a thread will get you banned.
        </li>
      </ul>
      <p>
        Startup subreddits are full of other founders. The communities where your users spend time, such as a subreddit for freelancers or for a programming language, are
        usually more valuable and usually stricter. Check their rules with the most care.
      </p>

      <h2 id="before-you-post">Before you post</h2>
      <ul>
        <li>
          <strong>Use your own account, with a real history.</strong> A fresh account or a brand-named one that only posts about your product looks like the spam the rules
          describe. Some subreddits also restrict new accounts: r/indiehackers, for example, says new accounts have to wait and can only ask questions through modmail.
        </li>
        <li><strong>Pick two or three communities</strong> where your users already ask about the problem you solve. Not ten.</li>
        <li><strong>Read each one&apos;s sidebar, wiki and pinned posts.</strong> Note the thread, day, flair or approval step it needs.</li>
        <li><strong>Read the top posts of the past month.</strong> Sort by Top and look at what the community upvotes: stories, screenshots, questions or technical write-ups.</li>
        <li><strong>Message the moderators if you aren&apos;t sure.</strong> Reddit&apos;s spam policy suggests exactly this, and a short, polite message costs nothing.</li>
        <li><strong>Make it easy to try.</strong> A demo, sample data or a free tier without a card gets you real feedback instead of questions about the sign-up wall.</li>
        <li>
          <strong>Link straight to your site.</strong> Reddit&apos;s spam policy lists link-masking or redirecting to harmful domains. Our advice is to skip link shorteners
          too, so readers can see where a link goes. Link posts usually show a preview image from your page, so check it with the free{" "}
          <Link href={OG_PREVIEW.path}>OG image preview</Link>.
        </li>
      </ul>

      <h2 id="write-the-post">Write a post that stays up</h2>
      <ul>
        <li><strong>Make it useful without the link.</strong> The problem, what you tried, what you built, what you learned. If the post is worthless once the link is removed, it is an ad.</li>
        <li><strong>Say it is yours, early.</strong> &ldquo;I built this&rdquo; in the first lines is honest and stops the &ldquo;is this an ad?&rdquo; replies before they start.</li>
        <li><strong>Ask one specific question.</strong> &ldquo;Would you trust this with X?&rdquo; gets better answers than &ldquo;thoughts?&rdquo;.</li>
        <li><strong>Put the link last</strong>, once, and only where the rules allow it. Some communities want it in a comment instead.</li>
        <li><strong>Only use numbers you can prove.</strong> Some communities ask for proof of revenue claims, and readers ask anyway.</li>
        <li><strong>No marketing language.</strong> Plain words, real details, the limits of what it does today.</li>
        <li>
          <strong>Write it by hand.</strong> Reddit&apos;s spam policy names generative AI tools among the tools that can spread spam, and readers spot generic launch copy
          quickly.
        </li>
      </ul>
      <p>An example for a made-up product, Tallybird, an invoice reminder app for freelancers (Tallybird doesn&apos;t exist):</p>
      <ul>
        <li>Weak title: &ldquo;Introducing Tallybird, the AI-powered invoicing platform freelancers love!&rdquo;</li>
        <li>Stronger title: &ldquo;I kept chasing the same three late invoices, so I built a reminder tool. What would stop you trusting it with your clients?&rdquo;</li>
      </ul>
      <p>And an outline for the body (an outline, not text to copy):</p>
      <ol>
        <li>The problem in your own words, with one real detail from your own experience.</li>
        <li>What you tried first and why it didn&apos;t work.</li>
        <li>What you built, how it works and what it can&apos;t do yet.</li>
        <li>&ldquo;I made this&rdquo;, what is free, and what costs money.</li>
        <li>The one question you want answered.</li>
        <li>The link, if the community allows it.</li>
      </ol>

      <h2 id="launch-day">On the day</h2>
      <ul>
        <li><strong>Post in one community at a time.</strong> Spread your posts over days, each written for its community, and stay in each thread.</li>
        <li><strong>Reply to every comment</strong>, quickly and specifically. Thank people for criticism and say what you will change.</li>
        <li><strong>Keep the conversation public.</strong> Don&apos;t DM everyone who commented: unsolicited messages are on Reddit&apos;s spam list, and r/startups bans asking for DMs.</li>
        <li><strong>If a post is removed,</strong> read the removal reason, fix the problem or ask the moderators politely. Don&apos;t repost it from another account.</li>
        <li><strong>Afterwards,</strong> keep commenting in those communities about things other than your product. That history is what makes your next post welcome.</li>
      </ul>

      <h2 id="banned">What gets founders banned</h2>
      <ul>
        <li><strong>Asking for upvotes</strong>, in a Slack, a Discord, a newsletter or anywhere else. Coordinated voting is vote manipulation under Reddit&apos;s rules.</li>
        <li><strong>Teammates or friends posting as if they were strangers</strong>, or a &ldquo;friend&rdquo; asking which tool you used so you can answer with a link.</li>
        <li><strong>Second accounts</strong> to vote, to comment or to get around a ban.</li>
        <li><strong>The same post in many subreddits</strong>, or the same link dropped into thread after thread.</li>
        <li><strong>Hiding that it is your product.</strong> Rule 5 asks you not to mislead people, and moderators read post histories.</li>
        <li><strong>Bots and automated replies</strong> that mention your product whenever a keyword appears. Reddit&apos;s spam policy uses this as an example.</li>
      </ul>

      <h2 id="indie-hackers">Posting on Indie Hackers the same week?</h2>
      <p>
        Indie Hackers (indiehackers.com, a separate site from the r/indiehackers subreddit) is a forum for founders, so a post about your product is more welcome there. The
        same habits still apply. In his <a href={SRC.ihTips}>tips for a successful post</a>, Indie Hackers founder Courtland Allen suggests asking a question, starting a
        discussion rather than making an announcement, helping others, posting milestones with what you learned, getting to the point quickly and putting any link at the end in
        its own paragraph. He also says the ranking rewards posts that start discussions.
      </p>

      <h2 id="other-channels">Launching on Show HN or Product Hunt too?</h2>
      <p>
        Hacker News is stricter about wording than most subreddits. A Show HN title must begin with &ldquo;Show HN&rdquo;, and asking for upvotes or comments gets posts
        penalised. The <a href={SRC.hnGuidelines}>HN guidelines</a> ask you not to post generated text and to write it yourself, and the{" "}
        <a href={SRC.showHnTips}>Show HN tips</a> from HN moderator dang say not to use an LLM to generate or even edit your text. The{" "}
        <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link> covers the rest. For Product Hunt, follow the{" "}
        <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link> and read <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt
        tagline</Link>. Built with Cursor, Lovable, Bolt or v0? <Link href="/how-to-launch-a-vibe-coded-app">How to launch a vibe-coded app</Link> covers the fixes to make
        before any of it.
      </p>
      <p>
        LaunchLoop drafts your landing copy, Product Hunt post, X thread, LinkedIn post and launch images from your repo, so you have more time for the threads that matter. Your
        Reddit and Show HN posts should still come from you. Start with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <GuideFaq guide={g} title="Reddit self-promotion FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <ul>
        <li><a href={SRC.redditRules}>Reddit Rules</a>, Reddit</li>
        <li><a href={SRC.spam}>Spam</a>, Reddit Help</li>
        <li><a href={SRC.disrupting}>Disrupting Communities</a>, Reddit Help</li>
        <li><a href={SRC.enforcement}>Content Moderation, Enforcement, and Appeals</a>, Reddit Help</li>
        <li><a href={SRC.selfPromotionWiki}>Self-promotion on Reddit</a>, Reddit&apos;s old guide, no longer updated</li>
        <li><a href={SRC.tenPercent}>Clarifications around our 10:1 self-promotional guidelines</a>, Reddit admins on r/modnews (December 2014)</li>
        <li><a href={SRC.startupsRules}>r/startups rules</a></li>
        <li><a href={SRC.webdevRules}>r/webdev rules</a></li>
        <li><a href={SRC.indieHackersRules}>r/indiehackers rules</a> and its <a href={SRC.indieHackersSub}>posting guidelines</a>, moderator post</li>
        <li><a href={SRC.languageLearning}>r/languagelearning rules for promotion</a></li>
        <li><a href={SRC.ihTips}>How do you make a successful post on Indie Hackers?</a>, by Courtland Allen (June 2019)</li>
        <li><a href={SRC.hnGuidelines}>Hacker News guidelines</a></li>
        <li><a href={SRC.showHnTips}>Tips for presenting a Show HN</a>, by HN moderator dang</li>
      </ul>
    </GuideLayout>
  );
}
