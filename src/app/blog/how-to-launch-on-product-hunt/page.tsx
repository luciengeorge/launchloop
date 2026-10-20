import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";
import { TAGLINE_CHECKER } from "@/lib/tools";

const p = post("how-to-launch-on-product-hunt");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const HELP = "https://help.producthunt.com/en/articles";
const LAUNCH = "https://www.producthunt.com/launch";

const SRC = {
  launchGuide: `${HELP}/17350772-launch-guide`,
  howToPost: `${HELP}/479557-how-to-post-a-product`,
  access: `${HELP}/481909-how-can-i-get-access-to-post`,
  community: `${HELP}/3615694-community-guidelines`,
  askUpvotes: `${HELP}/484935-can-i-ask-my-community-friends-family-to-upvote-a-product`,
  share: `${HELP}/2690626-how-do-i-share-my-post`,
  fairVoting: `${HELP}/11869098-how-does-product-hunt-ensure-fair-voting-and-prevent-spam-or-vote-manipulation`,
  points: `${HELP}/4853541-why-did-my-launch-points-go-down`,
  commenting: `${HELP}/10030102-commenting-guidelines`,
  schedule: `${HELP}/2724119-how-to-schedule-a-post`,
  shareScheduled: `${HELP}/15706445-how-to-share-a-scheduled-launch`,
  hunterMakers: `${HELP}/10082986-hunter-vs-makers-and-how-to-change-them`,
  huntLimits: `${HELP}/14440291-daily-hunt-limits`,
  featuring: `${HELP}/9883485-product-hunt-featuring-guidelines`,
  unreleased: `${HELP}/484932-can-i-submit-an-unreleased-product`,
  productOfTheDay: `${HELP}/11751186-product-of-the-day-week-month`,
  relaunch: `${HELP}/484934-can-i-relaunch-my-product`,
  forums: `${HELP}/11432379-maker-s-guide-to-product-forums`,
  howItWorks: `${LAUNCH}/how-product-hunt-works`,
  beforeLaunch: `${LAUNCH}/before-launch`,
  preparing: `${LAUNCH}/preparing-for-launch`,
  sharing: `${LAUNCH}/sharing-your-launch`,
  launchDayDuties: `${LAUNCH}/launch-day-duties`,
  launchDayQuestions: `${LAUNCH}/launch-day-questions`,
  daysAfter: `${LAUNCH}/days-after-launch`,
} as const;

const FAQ: FaqItem[] = [
  {
    q: "Is it worth launching on Product Hunt?",
    a: "It depends on what you want from the day. Product Hunt says the most common reasons to launch are reaching an engaged audience, getting feedback, validating an idea, collecting reviews, finding customers, funding or hires, and keeping up with competitors. It also says a launch is not only worth it if you finish first: there are plenty of reasons to launch besides the top of the leaderboard. It is a poor fit for a waitlist, a template or a course, which Product Hunt doesn't feature.",
  },
  {
    q: "Do I need a hunter to launch on Product Hunt?",
    a: "No. Product Hunt's Launch Guide says you can and should hunt your own product, and that there is no need for a special hunter. Its launch guide on producthunt.com adds that hunting is just posting, and that anyone with a personal Product Hunt account can do it. Paying someone to hunt your product goes against Product Hunt's guidelines.",
  },
  {
    q: "What time does a Product Hunt launch go live?",
    a: "At 12:01 AM Pacific time on the date you schedule. Product Hunt's homepage runs on a 24-hour cycle in Pacific time, so a launch at 12:01 AM gets the whole day. The help center says you can schedule a launch for any day within 30 days, and you can keep a draft until then.",
  },
  {
    q: "Can I ask people to upvote my Product Hunt launch?",
    a: "No. The Launch Guide says never to ask outright for upvotes or run anything that requires them, because it breaks Product Hunt's rules and can get the launch disqualified. Share the link, tell people what you built and ask for feedback instead. Votes that Product Hunt's systems judge to be fake are removed.",
  },
  {
    q: "How long after signing up can I post a product?",
    a: "A week. Product Hunt's help center says a new personal account has to wait one week before it can post, and that subscribing to the Product Hunt newsletter gives immediate access. Product Hunt recommends joining well before that, three months or more ahead of your launch, and taking part in the community first.",
  },
  {
    q: "Can I launch the same product on Product Hunt again?",
    a: "Yes, for a significant update. Product Hunt asks makers to wait at least six months between posts for the same product or company. Within six months you have to submit a relaunch request describing what changed, and new UIs or pricing changes don't count as significant.",
  },
];

export default function ProductHuntLaunchPostPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        Product Hunt publishes a lot about how it wants you to launch: a <a href={SRC.launchGuide}>Launch Guide</a> in its help center, a longer launch guide on producthunt.com,
        and posting, commenting and community guidelines. This post explains how launching on Product Hunt works according to those pages: how the site ranks launches, whether
        yours is a good fit, who can post, the rules on upvotes, what the listing needs and what launch day and the weeks after look like. Every rule is quoted and linked, so
        you can check it yourself.
      </p>
      <p>
        For the timed, step-by-step list of what to do and when, use the <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link>. For the tagline, read{" "}
        <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt tagline</Link> and test yours with the free{" "}
        <Link href={TAGLINE_CHECKER.path}>Product Hunt tagline checker</Link>.
      </p>

      <h2 id="how-it-works">How Product Hunt works</h2>
      <p>
        Product Hunt is a community where people post new products and others vote and comment on them. Its <a href={SRC.howItWorks}>How Product Hunt works</a> page says{" "}
        <q>Our community is made up of early adopters, makers, tech people, entrepreneurs, investors, and those who just love trying new products.</q> Some mechanics worth
        knowing before you plan anything:
      </p>
      <ul>
        <li>
          <strong>Every day is a separate race.</strong> The <a href={SRC.preparing}>launch preparation page</a> says <q>The homepage runs on a 24-hour cycle based on Pacific
          Standard Time.</q> The Launch Guide adds: <q>Your launch is eligible to be featured on the leaderboard for your launch day, where it competes with other products for
          the day&apos;s rank. After launch day, it keeps a permanent home on Product Hunt through your Product Page.</q>
        </li>
        <li>
          <strong>Not every launch is featured.</strong> The homepage shows featured products by default. The <a href={SRC.featuring}>Featuring Guidelines</a> say{" "}
          <q>By the time a product is visible on Product Hunt, we&apos;ve thoroughly evaluated it multiple times.</q> and that votes alone don&apos;t decide it:{" "}
          <q>Engagement Isn&apos;t Everything: While user engagement is important, it&apos;s not the sole factor in our featuring decisions.</q>
        </li>
        <li>
          <strong>Ranking is a mix of signals, and the formula is secret.</strong> <q>The homepage leaderboard changes throughout the day based on the number of upvotes,
          comments, time since submission, and other factors. We can&apos;t give the exact details of how our algorithm works because doing so would make it easier to be
          gamed.</q>
        </li>
        <li>
          <strong>Points, not just votes.</strong> The help center <a href={SRC.productOfTheDay}>says</a>{" "}
          <q>Points are a combination of upvotes and meaningful engagement (like comments or shares).</q> Product of the Day goes to the launch with the most points that day,
          and Product of the Week and Month work the same way over longer periods. On the <a href={SRC.launchDayQuestions}>launch day questions</a> page, Product Hunt answers
          the myth that maker upvotes count more: <q>False. All upvotes are equal.</q>
        </li>
        <li>
          <strong>It is free.</strong> <q>Product Hunt is free for everyone to use.</q> Advertising exists, but Product Hunt says{" "}
          <q>Ads can drive engagement with your product but these are separate from the leaderboard and rankings.</q>
        </li>
      </ul>

      <h2 id="should-you-launch">Should you launch on Product Hunt at all?</h2>
      <p>
        Product Hunt&apos;s own pages are clear that it suits some products and not others. Its list of common reasons to launch includes reaching an engaged audience, getting
        feedback, validating an idea, collecting reviews and testimonials, finding customers, funding or hires, and keeping up with competitors. If none of those is what you
        need right now, a launch can wait.
      </p>
      <h3>What fits</h3>
      <ul>
        <li>
          <strong>Something new, or a real update.</strong> The How Product Hunt works page lists <q>The product is new.</q> as its first guideline, followed by products with
          substantive updates since their last launch.
        </li>
        <li>
          <strong>Something people can use.</strong> <q>The product is usable.</q> The same page warns{" "}
          <q>Closed beta launches are usually not a good fit if it means our community can’t participate.</q> The Featuring Guidelines say{" "}
          <q>Live Products: We only feature products that are currently available.</q>, and the help center <a href={SRC.unreleased}>adds</a>{" "}
          <q>Products that only offer an email sign-up are not eligible for the homepage.</q>
        </li>
        <li>
          <strong>Something with an edge.</strong> The Featuring Guidelines look for products that are useful, novel, well crafted or creative, and say{" "}
          <q>Featured launches don’t need to score high in every category - often they spike in one or two of these.</q> The Launch Guide asks for <q>A clear edge. Make it
          obvious how you stand apart from what&apos;s already out there.</q>
        </li>
      </ul>
      <h3>What doesn&apos;t</h3>
      <p>
        The Featuring Guidelines list what Product Hunt doesn&apos;t feature, including <q>Waitlisted products (unless immediate access is provided)</q>, templates,
        boilerplates, directories, courses, books, services and deal sites. They also say{" "}
        <q>Value Over Monetization: We avoid featuring minimal, undifferentiated products that seem primarily focused on immediate monetization rather than providing long-term
        value.</q> If you built a quick app with an AI builder, that line is the one to read twice: <Link href="/how-to-launch-a-vibe-coded-app">how to launch a vibe-coded
        app</Link> covers what to fix before any launch.
      </p>
      <h3>Is now the right time?</h3>
      <ul>
        <li>
          <strong>Launch when you are ready.</strong> The launch preparation page says <q>Ultimately, the best time to launch your product is when you’re ready to do so.</q> The{" "}
          <a href={SRC.beforeLaunch}>before launch</a> page describes makers who ship early for feedback and makers who refine with beta users first, and leaves the choice to
          your goals.
        </li>
        <li>
          <strong>A launch spends your next six months.</strong> The <a href={SRC.relaunch}>relaunch article</a> says{" "}
          <q>we ask Makers to wait at least six months between posts for the same product or from the same company.</q> Earlier relaunches need a request and a significant
          update, so a half-ready launch has a cost.
        </li>
        <li>
          <strong>First place isn&apos;t the only outcome that counts.</strong> Product Hunt calls it a myth that a launch is only worth it at number one:{" "}
          <q>False. Everybody wants to be #1, but there are plenty of reasons to launch besides reaching the top of the leaderboard.</q> The Launch Guide&apos;s advice is to{" "}
          <q>Care more about real engagement than numbers like point totals.</q>
        </li>
      </ul>
      <p>
        If your audience is developers who want to try something technical, Hacker News may suit it better, and it works very differently: see the{" "}
        <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link> and <Link href="/how-to-write-a-show-hn-post">how to write a Show HN post</Link>.
      </p>

      <h2 id="who-can-post">Who can hunt or post</h2>
      <p>
        On Product Hunt, the person who submits a launch is its hunter, and the people who built it are its makers. The help center sums it up as{" "}
        <q>Hunters post launches; Makers create them.</q> (<a href={SRC.hunterMakers}>source</a>) Makers tagged on a launch comment with a Maker badge, so people can tell who
        built it.
      </p>
      <h3>Accounts</h3>
      <ul>
        <li>
          <strong>Personal accounts only.</strong> The <a href={SRC.howToPost}>How to post a product</a> article: <q>You&apos;ll need a personal account to post a product on
          Product Hunt. Company accounts cannot hunt or post products.</q> And from the <a href={SRC.access}>access article</a>:{" "}
          <q>Company or branded accounts cannot post, vote, or comment on Product Hunt.</q>
        </li>
        <li>
          <strong>New accounts wait a week.</strong> <q>Once you&apos;ve created a personal account, you will need to wait one week before you can post a product.</q> There is a
          shortcut: <q>If you&apos;re ready to post earlier than a week, you can subscribe to our newsletter for immediate access.</q> The before launch page treats the week as a
          floor: <q>One week is just a minimum, too; we highly recommend joining the platform well ahead of your launch (three months or more) and building a presence in the
          community.</q>
        </li>
        <li>
          <strong>Profiles must look like a person.</strong> The <a href={SRC.community}>Community Guidelines</a> say{" "}
          <q>we require that profiles appear human and represent an individual, not a company, service, brand, or organization.</q> They warn that{" "}
          <q>Incomplete or misleading profiles may result in a higher chance of your contributions being reviewed, limited visibility, and/or the removal of contributions from
          the site.</q>
        </li>
        <li>
          <strong>Co-makers need their own accounts.</strong> You add makers by their Product Hunt username, so the launch preparation page says to{" "}
          <q>make sure they’ve created an account well before launch day so they can join the conversation and are credited for their hard work.</q>
        </li>
      </ul>
      <h3>Hunters</h3>
      <ul>
        <li>
          <strong>Anyone can hunt, including you.</strong> The before launch page says: <q>Hunting is just posting. A hunter can be anybody with a personal Product Hunt account.
          That can be you, your co-makers, or an enthusiastic user.</q> The Launch Guide goes further: <q>You can and should hunt your own product. There&apos;s no need for a
          special hunter.</q>
        </li>
        <li>
          <strong>Self-hunted launches do fine.</strong> Product Hunt&apos;s own figures on the before launch page are <q>79% of featured posts were by makers who self-hunted</q>{" "}
          and <q>60% of #1 Product of the Day winners were self-hunted</q>. The page doesn&apos;t say what period they cover.
        </li>
        <li>
          <strong>Never pay a hunter.</strong> <q>There is no rule against using a hunter outside of your team, but paying people to hunt your product goes against our
          guidelines.</q> The same section warns: <q>Products caught breaking the rules will be unfeatured or removed and the makers associated with the product may be
          permanently banned from the site.</q>
        </li>
        <li>
          <strong>Hunters have a daily cap.</strong> <q>Users can schedule up to 2 hunts per day through the Product Hunt platform.</q> (<a href={SRC.huntLimits}>source</a>)
        </li>
        <li>
          <strong>If someone hunts you first.</strong> The launch day questions page gives two options: ride the attention, or{" "}
          <q>Let us know ASAP. We can remove the product and let the community member know a launch is on the way.</q>
        </li>
      </ul>

      <h2 id="scheduling">Scheduling rules</h2>
      <ul>
        <li>
          <strong>Launches start at 12:01 AM Pacific.</strong> <q>Every launch goes live at 12:01 AM Pacific on its scheduled date, so plan around that window.</q> The launch
          preparation page explains the default: <q>Posting at 12:01am PST gives people a full 24 hours to view your product.</q>
        </li>
        <li>
          <strong>You can book up to about a month ahead.</strong> The help center&apos;s <a href={SRC.schedule}>scheduling article</a> says you pick{" "}
          <q>the day within 30 days of your current day for the post to go live.</q> Until then, <q>It will not be indexed on the site, and no users will be able to upvote it
          until the scheduled time.</q>
        </li>
        <li>
          <strong>Scheduled launches are private by default.</strong> The help center <a href={SRC.shareScheduled}>says</a>{" "}
          <q>By default, all scheduled launches are only visible by the Makers and product team members associated with the launch.</q> You can make the page public from the
          lock icon in the scheduled banner.
        </li>
        <li>
          <strong>Drafts are fine.</strong> <q>You can save a draft anytime and pick up where you left off.</q>
        </li>
        <li>
          <strong>One launch per company per day.</strong> The Featuring Guidelines say that if two launches from the same company are scheduled on the same day, Product Hunt
          may move one of them to a later date.
        </li>
      </ul>
      <p>
        The Launch Guide&apos;s only advice on choosing the day is about you, not the calendar: <q>Pick a day when you can be around for the key stretches, like the first few
        hours and your audience&apos;s peak time.</q> The <Link href="/product-hunt-launch-checklist#one-week-out">checklist</Link> covers picking the day in practice.
      </p>

      <h2 id="upvotes">Asking for upvotes, and fake engagement</h2>
      <p>This is where launches get into trouble, and Product Hunt says the same thing across its pages.</p>
      <ul>
        <li>
          <strong>Don&apos;t ask for upvotes.</strong> The Launch Guide: <q>never ask outright for upvotes or run anything that requires them. It breaks Product Hunt&apos;s rules
          and can get your launch disqualified.</q> Asked whether you can ask friends and family, the help center <a href={SRC.askUpvotes}>answers</a>:{" "}
          <q>Please don&apos;t. People should upvote things they genuinely like or find interesting, not because they were peer pressured to do so.</q> It warns that{" "}
          <q>asking or incentivizing people to upvote may trigger the algorithm to drop the product in the ranks or remove it from the homepage entirely.</q>
        </li>
        <li>
          <strong>No mass messages, bots or incentives.</strong> The Community Guidelines, under Do Not Spam:{" "}
          <q>Mass messaging users, asking for upvotes, using bots, incentivizing upvotes, and any other form of artificially increasing activity on your contribution is not
          acceptable.</q> The help center&apos;s <a href={SRC.share}>sharing article</a> lists what to avoid: mass messages asking for upvotes, discounts or freebies in
          exchange for upvotes, and coordinated voting pushes.
        </li>
        <li>
          <strong>No contests tied to votes.</strong> The <a href={SRC.sharing}>sharing your launch</a> page: <q>Don’t run contests that require upvotes or reward people for
          upvotes.</q> Product Hunt says it will ask you to stop, and then: <q>If you continue doing so, we may unfeature your product.</q>
        </li>
        <li>
          <strong>Fake accounts get filtered out.</strong> The help center&apos;s article on <a href={SRC.points}>falling points</a> says{" "}
          <q>Product Hunt actively filters out inauthentic activity. This includes bot accounts, fake profiles, AI-generated actions, and any voting behavior that doesn’t
          match healthy, human community engagement.</q> And: <q>If points are removed, it’s because they didn’t come from legitimate users.</q>
        </li>
        <li>
          <strong>Your supporters need real accounts too.</strong> The <a href={SRC.fairVoting}>fair voting article</a> asks you to{" "}
          <q>Advise your audience to follow platform standards when creating accounts (such as a complete, personal account) and engaging with launches.</q> and to{" "}
          <q>Avoid overtly coordinated campaigns that might appear artificial to detection systems.</q>
        </li>
        <li>
          <strong>No generated comments.</strong> The <a href={SRC.commenting}>Commenting Guidelines</a> say <q>Our community wants to talk to and hear from real people. No LLMs or
          Chrome extensions please!</q> The Community Guidelines add <q>Self-promoting in comments will also be removed.</q>
        </li>
      </ul>
      <p>
        What you can do: share the link where you already have an audience, and ask for something other than votes. The sharing your launch page puts it as{" "}
        <q>Ask for feedback, comments, opinions, help spreading the word, not for upvotes.</q> The help center adds that{" "}
        <q>Product Hunt’s ranking system considers more than just upvotes.</q>
      </p>

      <h2 id="listing">What the listing needs</h2>
      <p>
        The name, tagline, description, topics, thumbnail, video and maker comment are covered in the checklist&apos;s{" "}
        <Link href="/product-hunt-launch-checklist#the-listing">Write the listing</Link> and <Link href="/product-hunt-launch-checklist#images">Prepare the images</Link>{" "}
        sections, and the tagline has its own guide: <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt tagline</Link>. Product Hunt&apos;s{" "}
        <a href={SRC.howToPost}>How to post a product</a> article and launch preparation page add a few rules the checklist doesn&apos;t cover:
      </p>
      <ul>
        <li>
          <strong>Two images or more.</strong> <q>The gallery will need 2+ images before it is viewable.</q>
        </li>
        <li>
          <strong>YouTube only.</strong> <q>For videos, only YouTube links are supported.</q>
        </li>
        <li>
          <strong>No shortened or tracking links.</strong> <q>Shortened links (e.g. bit.ly) and track links (e.g. Google UTMs) are not accepted.</q>
        </li>
        <li>
          <strong>Linking straight to the product is fine.</strong> On the myth that direct links are penalised, Product Hunt says:{" "}
          <q>There is no penalty for linking directly to your product, in actuality, we encourage it!</q>
        </li>
        <li>
          <strong>Pricing.</strong> <q>Broadly, the three options are: free, paid, and paid (with a free trial or plan).</q>
        </li>
        <li>
          <strong>Shoutouts.</strong> The Launch Guide suggests <q>Shoutouts to the tools that helped you build it (in the Shoutouts field)</q>, and the launch preparation page
          notes <q>You only get three shoutouts per product launch</q>. If you built with Cursor, Lovable, Bolt or v0, this is where to credit them.
        </li>
      </ul>

      <h2 id="launch-day">What launch day and after look like</h2>
      <h3>On the day</h3>
      <p>
        Product Hunt describes launch day as a day of conversation. The Launch Guide: <q>When launch day arrives, show up and be present. Reply to comments quickly and honestly,
        and walk people through how and why you built it.</q> The sharing your launch page puts it this way:{" "}
        <q>Your two most important tasks on launch day are getting the word out, and being accessible to the community by responding to comments in real time or as close to it
        as possible.</q> The Launch Guide&apos;s short version: <q>Engage like a human. Invite feedback instead of fishing for votes.</q>
      </p>
      <ul>
        <li>
          <strong>You watch it from a dashboard.</strong> The <a href={SRC.launchDayDuties}>launch day dashboard</a>{" "}
          <q>will track your position, upvotes, comments, and reviews throughout the day (and after launch day).</q>
        </li>
        <li>
          <strong>Points can go down.</strong> The falling points article says that in the vast majority of cases a dip means Product Hunt&apos;s filters removed votes that
          weren&apos;t genuine, and that your launch <q>isn’t being penalized</q>.
        </li>
        <li>
          <strong>Other communities aren&apos;t a megaphone.</strong> Product Hunt warns: <q>Launch day is not a time to go spamming Reddit and Indie Hackers if you haven’t already
          been posting there</q>. If you do post elsewhere, follow each community&apos;s rules: see <Link href="/how-to-promote-on-reddit">how to promote your app on
          Reddit</Link> and <Link href={postPath({ slug: "how-to-launch-on-indie-hackers" })}>how to launch on Indie Hackers</Link>.
        </li>
        <li>
          <strong>Your Product Page is waiting.</strong> Each launch also creates a Product Page, and the launch day duties page says{" "}
          <q>You should request access to edit your Product Page as soon as you launch.</q>
        </li>
      </ul>
      <h3>The weeks after</h3>
      <ul>
        <li>
          <strong>The conversation carries on.</strong> The Launch Guide&apos;s list starts with <q>Keep replying to comments for a few days afterward.</q> and includes{" "}
          <q>Turn the best feedback into real improvements.</q>
        </li>
        <li>
          <strong>Two weeks of launch page, then the Product Page.</strong> The <a href={SRC.daysAfter}>days after launch</a> page says{" "}
          <q>You can promote your Launch Page for two weeks after launch day.</q> After that, <q>Your Product Page is your permanent and comprehensive source of truth for your
          product.</q>
        </li>
        <li>
          <strong>Your forum keeps followers informed.</strong> Every product has a forum, and the <a href={SRC.forums}>forum guide</a> says{" "}
          <q>Every thread posted within a product forum notifies all of that product’s followers</q>. The Launch Guide suggests you{" "}
          <q>Announce new updates in the Forums to reach new users.</q>
        </li>
        <li>
          <strong>The next launch is for the next big change.</strong> <q>You can launch again every time you ship a major feature or update.</q> Within six months that means a
          relaunch request, and <q>New UIs, pricing plan changes, etc. are not considered significant updates.</q>
        </li>
      </ul>

      <h2 id="next">Next steps</h2>
      <p>
        Ready to plan the day itself? The <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link> has the step-by-step list, from a week out to the week
        after. Write the tagline with <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt tagline</Link> and check it in the{" "}
        <Link href={TAGLINE_CHECKER.path}>tagline checker</Link>. Built it with an AI builder? Read <Link href="/how-to-launch-a-vibe-coded-app">how to launch a vibe-coded
        app</Link> first.
      </p>
      <p>
        LaunchLoop reads your repo or live site and drafts your Product Hunt tagline, description and first comment, plus an X thread, a LinkedIn post and launch images, all
        inside each platform&apos;s limits. Start with a <Link href="/#start">free preview</Link> or see <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="Launching on Product Hunt: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of October 2026. Every quote on this page was read on Product Hunt&apos;s help center and on producthunt.com on 20 October 2026. Product Hunt&apos;s pages
        don&apos;t always agree with each other, and they change without notice, so check the links before you launch.
      </p>
      <ul>
        <li><a href={SRC.launchGuide}>Launch Guide</a>, Product Hunt Help Center</li>
        <li><a href={SRC.howToPost}>How to post a product</a>, Product Hunt Help Center (dated May 2025)</li>
        <li><a href={SRC.access}>How can I get access to post?</a>, Product Hunt Help Center (dated July 2025)</li>
        <li><a href={SRC.community}>Community Guidelines</a>, Product Hunt Help Center (dated April 2025)</li>
        <li><a href={SRC.askUpvotes}>Can I ask my community/friends/family to upvote a product?</a>, Product Hunt Help Center (dated February 2025)</li>
        <li><a href={SRC.share}>How do I share my post?</a>, Product Hunt Help Center (dated February 2025)</li>
        <li><a href={SRC.fairVoting}>How does Product Hunt ensure fair voting and prevent spam or vote manipulation?</a>, Product Hunt Help Center (dated July 2025)</li>
        <li><a href={SRC.points}>Why did my launch points go down?</a>, Product Hunt Help Center (dated May 2025)</li>
        <li><a href={SRC.commenting}>Commenting Guidelines</a>, Product Hunt Help Center (dated July 2025)</li>
        <li><a href={SRC.schedule}>How to schedule a post</a>, Product Hunt Help Center (dated February 2026)</li>
        <li><a href={SRC.shareScheduled}>How to share a scheduled launch</a>, Product Hunt Help Center (dated June 2026)</li>
        <li><a href={SRC.hunterMakers}>Hunter vs Makers and how to change them</a>, Product Hunt Help Center (dated February 2025)</li>
        <li><a href={SRC.huntLimits}>Daily Hunt Limits</a>, Product Hunt Help Center (dated April 2026)</li>
        <li><a href={SRC.featuring}>Product Hunt Featuring Guidelines</a>, Product Hunt Help Center (dated March 2026)</li>
        <li><a href={SRC.unreleased}>Can I submit an unreleased product?</a>, Product Hunt Help Center (dated February 2025)</li>
        <li><a href={SRC.productOfTheDay}>Product of the Day, Week, &amp; Month</a>, Product Hunt Help Center (dated July 2025)</li>
        <li><a href={SRC.relaunch}>Can I relaunch my product?</a>, Product Hunt Help Center (dated July 2026)</li>
        <li><a href={SRC.forums}>Maker&apos;s guide to Product Forums</a>, Product Hunt Help Center (dated May 2025)</li>
        <li><a href={SRC.howItWorks}>How Product Hunt works</a>, Product Hunt launch guide</li>
        <li><a href={SRC.beforeLaunch}>Before launch</a>, Product Hunt launch guide</li>
        <li><a href={SRC.preparing}>Preparing for launch</a>, Product Hunt launch guide</li>
        <li><a href={SRC.sharing}>Sharing your launch</a>, Product Hunt launch guide</li>
        <li><a href={SRC.launchDayDuties}>Launch Day duties</a>, Product Hunt launch guide</li>
        <li><a href={SRC.launchDayQuestions}>Launch Day questions</a>, Product Hunt launch guide</li>
        <li><a href={SRC.daysAfter}>Days after your launch</a>, Product Hunt launch guide</li>
      </ul>
    </BlogPostLayout>
  );
}
