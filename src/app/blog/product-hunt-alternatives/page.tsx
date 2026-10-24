import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";

const p = post("product-hunt-alternatives");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const SRC = {
  betalistHelp: "https://betalist.com/help",
  betalistCriteria: "https://betalist.com/criteria",
  betalistSubmit: "https://betalist.com/submit",
  betalistAdvertise: "https://betalist.com/advertise",
  betalistBoost: "https://betalist.com/boost",
  devhuntFaq: "https://devhunt.org/faq",
  devhuntAdvertise: "https://devhunt.org/advertise",
  showHn: "https://news.ycombinator.com/showhn.html",
  uneedHowItWorks: "https://www.uneed.best/how-it-works",
  uneedPricing: "https://www.uneed.best/pricing",
  uneedAccept: "https://help.uneed.best/common-questions-and-issues/what-we-accept",
  fazierSubmit: "https://fazier.com/submit",
  fazierFaqs: "https://falakdigital.notion.site/FAQs-8e4b805abeef4343ba0ae528d32ab292",
  fazierTerms: "https://fazier.com/terms-of-service",
  tinyAbout: "https://www.tinystartups.com/about",
  tinyTerms: "https://www.tinystartups.com/terms",
  tinySubmit: "https://www.tinystartups.com/submit",
  microlaunchPremium: "https://microlaunch.net/premium",
  microlaunch: "https://microlaunch.net/",
  peerlistIntro: "https://help.peerlist.io/individual/launchpad/introduction",
  peerlistRules: "https://help.peerlist.io/individual/launchpad/guidelines-faqs",
  peerlistHowTo: "https://help.peerlist.io/individual/launchpad/how-to-launch-a-project-on-peerlist-launchpad",
  peerlistFaq: "https://help.peerlist.io/individual/launchpad/frequently-asked-questions-about-spotlight-by-peerlist",
  peerlistVerification: "https://help.peerlist.io/individual/peerlist-profile/verification",
  indieHackersAbout: "https://www.indiehackers.com/about",
  sideProject: "https://www.reddit.com/r/SideProject/",
  sideProjectArchive: "https://web.archive.org/web/20260828184531/https://old.reddit.com/r/SideProject/about/rules",
  alphaBeta: "https://www.reddit.com/r/alphaandbetausers/",
  alphaBetaArchive: "https://web.archive.org/web/20260824183616/https://old.reddit.com/r/alphaandbetausers/about/rules/",
} as const;

const FAQ: FaqItem[] = [
  {
    q: "What is the best Product Hunt alternative?",
    a: "There isn't one best site, because they are built for different products. DevHunt only takes developer tools. BetaList features products that are unreleased or recently launched. Show HN wants something people can try right away. Uneed, Fazier, Tiny Startups and Microlaunch are general launch boards. Pick the group that fits your product, then read that site's rules before you submit.",
  },
  {
    q: "Which Product Hunt alternatives are free?",
    a: "On 20 October 2026, these sites said on their own pages that you can list or launch without paying: Uneed (the free waiting line), DevHunt (a free listing, while a launch costs $19), Peerlist Launchpad (with a verified profile, and workplace verification is free), Fazier (the Basic tier, which asks you to link back to Fazier), and Tiny Startups. Hacker News, Indie Hackers and Reddit list no fee for posting. BetaList says it has no free submission option, and Microlaunch's public launch window only shows a paid launch.",
  },
  {
    q: "Is BetaList free?",
    a: "No. BetaList's Help page says all submissions are paid and there is no free submission option. Plans and prices are shown at the end of the submission form, and if your startup isn't selected the payment is refunded in full automatically. Lists that still describe BetaList as free are out of date.",
  },
  {
    q: "Where can I launch a product that is still a waitlist?",
    a: "BetaList is the one built for it: its submission criteria welcome products that are not yet available to anyone, as long as visitors can sign up. Most others want a working product. Uneed declines products behind a waitlist or an invite code, Show HN says not to post landing pages, and r/alphaandbetausers removes links to pages that only collect email addresses.",
  },
  {
    q: "Do these sites give you a do-follow backlink?",
    a: "Some do, with conditions that differ by site. DevHunt makes the link dofollow on a paid launch. Uneed's free line keeps a do-follow link with an upvote score of 20 or more on launch day. Peerlist awards a backlink only to the top 5 projects of the week. Fazier's free tier requires a backlink to Fazier from your site. Read the conditions on each site before you count on a link.",
  },
];

export default function ProductHuntAlternativesPostPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        Product Hunt isn&apos;t the only place to launch. This is a guide to eleven others that indie makers use, from DevHunt and BetaList to Show HN and two subreddits. For
        each one it covers what the site is for, how to submit, whether it is free, what the paid options cost, and its rules, using only what the site&apos;s own pages say.
        Prices are as the sites showed them on 21 October 2026, and they change, so check before you pay.
      </p>
      <p>
        There are no scores or rankings here. The sites are grouped by the kind of product they fit: developer tools, products still in beta, general launch boards, and
        communities where you post as yourself. If you are launching on Product Hunt as well, read{" "}
        <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link> first.
      </p>

      <h2 id="at-a-glance">Free or paid, at a glance</h2>
      <p>What each site&apos;s own pages said about cost. Where a site shows a crossed-out price next to a lower one, the table gives the lower price.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-muted-foreground">
          <thead>
            <tr className="border-b border-border text-foreground">
              <th className="py-2 pr-4 font-medium">Site</th>
              <th className="py-2 pr-4 font-medium">Free route</th>
              <th className="py-2 font-medium">Paid options the site lists</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">DevHunt</td>
              <td className="py-2 pr-4 align-top">Free listing with a nofollow link</td>
              <td className="py-2 align-top">Launch $19, boosted launch $49</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">Show HN</td>
              <td className="py-2 pr-4 align-top">No fee listed</td>
              <td className="py-2 align-top">None listed</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">BetaList</td>
              <td className="py-2 pr-4 align-top">None: all submissions are paid</td>
              <td className="py-2 align-top">Plans shown only in the submission form; Boost $99/week or $199/month after you are featured</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">r/alphaandbetausers</td>
              <td className="py-2 pr-4 align-top">No fee listed</td>
              <td className="py-2 align-top">None listed</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">Uneed</td>
              <td className="py-2 pr-4 align-top">Free waiting line, at least 30 days out</td>
              <td className="py-2 align-top">Fast-track $14.99, Skip the waiting line $39.99, Relaunch $15</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">Fazier</td>
              <td className="py-2 pr-4 align-top">Basic, if you link back to Fazier</td>
              <td className="py-2 align-top">Lite $29, Premium $49, Super $99</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">Tiny Startups</td>
              <td className="py-2 pr-4 align-top">Free launch, review queue</td>
              <td className="py-2 align-top">Skip the queue: £29 on its About page; higher in its terms and submit form</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">Microlaunch</td>
              <td className="py-2 pr-4 align-top">Not shown on its public pages</td>
              <td className="py-2 align-top">Launch Pro $39, Launch Plus $79</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">Peerlist Launchpad</td>
              <td className="py-2 pr-4 align-top">Free, with a verified profile</td>
              <td className="py-2 align-top">Identity verification has a fee it doesn&apos;t state; workplace verification is free</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 align-top">Indie Hackers</td>
              <td className="py-2 pr-4 align-top">No fee listed</td>
              <td className="py-2 align-top">None listed</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 align-top">r/SideProject</td>
              <td className="py-2 pr-4 align-top">No fee listed</td>
              <td className="py-2 align-top">None listed</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Prices checked on 21 October 2026.</p>

      <h2 id="dev-tools">If you built a developer tool</h2>
      <h3 id="devhunt">DevHunt</h3>
      <p>
        <strong>What it is.</strong> The <a href={SRC.devhuntFaq}>DevHunt FAQ</a> says <q>DevHunt is a launchpad for developer tools, built by developers.</q> Launches run for a
        week, and the FAQ says the platform itself is open source. It takes <q>Tools for developers</q>, from open-source projects and APIs to CLIs, databases and MCP servers.
      </p>
      <p>
        <strong>How to submit.</strong> <q>Sign in, open your account and submit your tool with its name, website, description, logo and screenshots.</q> Then you pick a launch
        week.
      </p>
      <p>
        <strong>Free or paid.</strong> <q>Listing a tool is free: every tool gets a permanent page with a nofollow link. Launching costs $19 once: you choose the launch week, get
        a spot in the newsletter, and your link becomes dofollow.</q> And: <q>For $49 the launch is boosted: on equal votes it is listed above other launches, on the site and in
        the weekly email, and gets its own post on X.</q>
      </p>
      <p>
        <strong>Audience.</strong> Its <a href={SRC.devhuntAdvertise}>advertise page</a> gives 150K page views a month and 40,000 newsletter subscribers.
      </p>
      <p>
        <strong>Rules.</strong> <q>Tools that are not for developers, NSFW tools, and services that sell fake engagement are not accepted.</q> On voting:{" "}
        <q>You have to sign in (GitHub or Google) to vote or comment, which keeps the votes from real people.</q>
      </p>

      <h3 id="show-hn">Show HN, on Hacker News</h3>
      <p>
        <strong>What it is.</strong> The <a href={SRC.showHn}>Show HN guidelines</a> open with{" "}
        <q>Show HN is for something you&apos;ve made that other people can play with.</q> It isn&apos;t only for developer tools, but the bar is that readers can try the thing.
      </p>
      <p>
        <strong>How to submit.</strong> <q>To post, submit a story whose title begins with &quot;Show HN&quot;.</q> The guidelines say it appears on the Show HN new page first,
        and moves to the show page once it clears a small points threshold.
      </p>
      <p>
        <strong>Free or paid.</strong> The guidelines list no fee and no paid placement. A Show HN is a normal Hacker News submission.
      </p>
      <p>
        <strong>Rules.</strong> Off topic are <q>blog posts, sign-up pages, newsletters, lists, and other reading material</q>. The project has to be your own and non-trivial:{" "}
        <q>Don&apos;t post quickly-generated one-offs; anybody can do that now.</q> And <q>Please don&apos;t ask friends to upvote or comment. That&apos;s not ok on HN.</q>
      </p>
      <p>
        The title format, what to write in your first comment and how to reply are in{" "}
        <Link href="/how-to-write-a-show-hn-post">how to write a Show HN post</Link> and the <Link href="/show-hn-launch-checklist">Show HN launch checklist</Link>.
      </p>

      <h2 id="early-stage">If your product is pre-launch or in beta</h2>
      <h3 id="betalist">BetaList</h3>
      <p>
        <strong>What it is.</strong> From the <a href={SRC.betalistHelp}>BetaList Help page</a>:{" "}
        <q>BetaList is the place for early adopters to discover upcoming and recently launched internet startups, and for startup founders to share their startup with the world
        and get early user feedback.</q> Its <a href={SRC.betalistCriteria}>submission criteria</a> explain why it wants new products:{" "}
        <q>BetaList readers come here to discover what&apos;s new. If your product has been live for a while or has already had significant press coverage, it&apos;s not really
        news to them anymore.</q> Under <q>Aim for</q> they list <q>Not yet available to anyone (pre-launch landing page)</q>,{" "}
        <q>Private beta accessible by invitation only</q> and <q>Recently launched</q>, ideally within the last few weeks. Under <q>Common pitfalls</q> they list{" "}
        <q>Launched months or years ago</q>.
      </p>
      <p>
        <strong>How to submit.</strong> The <a href={SRC.betalistSubmit}>submission page</a> asks for your website URL and email:{" "}
        <q>New here? We create your account on the spot.</q> After payment, the editorial team reviews the startup and emails you the decision.
      </p>
      <p>
        <strong>Free or paid.</strong> Paid only, and this is the line most worth checking, because some lists of Product Hunt alternatives still call BetaList free. The Help
        page now says: <q>All submissions are paid. There is no free submission option.</q> The prices aren&apos;t public: <q>Current plans and prices are shown at the end of the
        submission form.</q> <q>If your startup isn&apos;t selected, you get a full refund automatically.</q> The plans{" "}
        <q>differ mainly by how quickly your startup is featured and whether newsletter inclusion is guaranteed.</q> After you are featured, a{" "}
        <a href={SRC.betalistBoost}>Boost</a> keeps you on the homepage and in the newsletter for $99 a week or $199 a month.
      </p>
      <p>
        <strong>Audience.</strong> The <a href={SRC.betalistAdvertise}>advertise page</a> says <q>Promote your product to startup founders and early adopters</q>, and its plan
        cards offer a <q>Newsletter slot (70k+ subscribers)</q>.
      </p>
      <p>
        <strong>Rules.</strong>
      </p>
      <ul>
        <li>
          <strong>Your own domain.</strong> <q>Your startup must have its own domain</q>, and the Help page rules out free hosting subdomains like vercel.app or
          netlify.app, and direct links to app stores. If you built with an AI app builder, put the app on a custom domain first.
        </li>
        <li>
          <strong>A real landing page.</strong> An untouched free or paid template, default Bootstrap styles and hosted builders like LaunchRock or Unbounce are on the
          criteria&apos;s list of common pitfalls. A heavily customized template that no longer looks templated is fine.
        </li>
        <li>
          <strong>Technology startups only.</strong> <q>Our audience comes to BetaList specifically to discover new technology startups.</q> Blogs, courses, books,
          newsletters, online stores and agencies are on the pitfalls list.
        </li>
        <li>
          <strong>Twice at most.</strong> <q>Each startup gets up to two opportunities to be featured: once pre-launch and once at launch.</q>
        </li>
        <li>
          <strong>Visitors should be able to sign up or get access.</strong> A signup form, a download button or a social login all count. &ldquo;Follow us on X to get notified&rdquo;
          as the only way to opt in doesn&apos;t.
        </li>
      </ul>

      <h3 id="alphaandbetausers">r/alphaandbetausers</h3>
      <p>
        <strong>What it is.</strong> <a href={SRC.alphaBeta}>r/alphaandbetausers</a> is a subreddit for finding early testers. Its sidebar says{" "}
        <q>Our innovators need people to use their products and give them feedback!</q> Reddit blocked our requests to its own pages, so this section is based on the{" "}
        <a href={SRC.alphaBetaArchive}>Internet Archive&apos;s copy of its rules page</a> from 24 August 2026. Open the live subreddit before you post.
      </p>
      <p>
        <strong>How to submit.</strong> A text post. <q>Please tag title with stage and system, i.e., [Android, Alpha] or [IOS, Beta]</q>, and{" "}
        <q>Please add a description of your product</q>.
      </p>
      <p>
        <strong>Free or paid.</strong> No fee or paid option is listed.
      </p>
      <p>
        <strong>Rules.</strong> <q>Posts must include links to products that are ready to be tested</q>. Waitlists are out:{" "}
        <q>DO NOT post links to pages that only request email addresses or &quot;registration for launch&quot; or &quot;apply here&quot; for future testing. These will be
        removed.</q> And the community asks for something back:{" "}
        <q>If you are posting, please take the time to test someone else&apos;s product as well.</q>
      </p>

      <h2 id="general">General launch boards</h2>
      <h3 id="uneed">Uneed</h3>
      <p>
        <strong>What it is.</strong> <q>Uneed is a social launchpad for tech products.</q> Its <a href={SRC.uneedHowItWorks}>how it works</a> page says{" "}
        <q>Every day at 12:00 AM PST, a new batch of products goes live on the homepage</q>. The day leaderboard resets daily, and the week, month and year leaderboards roll rather than reset.
      </p>
      <p>
        <strong>How to submit.</strong> Add your product on the submission page, then sign up to save it. <q>Submitting is not scheduling.</q> You go back to your dashboard and
        choose how to launch.
      </p>
      <p>
        <strong>Free or paid.</strong> There are three ways to launch a new product:
      </p>
      <ul>
        <li>
          <strong>The free waiting line.</strong> Uneed assigns the date, <q>at least 30 days out, at the back of the line.</q>{" "}
          <q>Your launch needs an upvote score of 10 on launch day to stay published, and 20 to keep a do-follow backlink.</q> Below 10, the product goes back to your dashboard
          and can&apos;t join the free line again.
        </li>
        <li>
          <strong>Fast-track, $14.99.</strong> A date about two weeks out, and the product stays published whatever happens on launch day.
        </li>
        <li>
          <strong>Skip the waiting line, $39.99.</strong> <q>pick the exact date you want. Published with a do-follow backlink for life, no minimum upvote score.</q>
        </li>
      </ul>
      <p>A product you have already launched there can relaunch for $15. The <a href={SRC.uneedPricing}>pricing page</a> also lists a yearly Pro subscription and advertising.</p>
      <p>
        <strong>Audience.</strong> The pricing page says 125K monthly visitors and 26,000 newsletter subscribers, and describes the audience as{" "}
        <q>mostly made of founders, indie hackers, tech enthusiasts</q>.
      </p>
      <p>
        <strong>Rules.</strong>{" "}
        <q>Free submissions go through moderation and can be declined, most often because they fall into a category we already receive dozens of every week. Paid launches are
        never declined.</q> Its page on <a href={SRC.uneedAccept}>what it accepts</a> turns down generic AI wrappers, low-effort tools, copycats, spam, NSFW products, over-saturated categories and gated products:{" "}
        <q>Our reviewers need to be able to actually try your product.</q> NSFW and closed or invite-only products are refused even on a paid launch, with a refund. On votes:{" "}
        <q>Don&apos;t buy votes: we detect it, the votes get removed, and repeat offenders get banned.</q>
      </p>

      <h3 id="fazier">Fazier</h3>
      <p>
        <strong>What it is.</strong> A launch board with daily, weekly and monthly leaderboards. Its <a href={SRC.fazierSubmit}>submit page</a> sums it up as{" "}
        <q>Find your next favorite product or submit your own.</q> and pitches makers with{" "}
        <q>Give your product the spotlight it deserves. Start free or go premium for maximum visibility.</q>
      </p>
      <p>
        <strong>How to submit.</strong> Make an account, then fill in the launch form: name, tagline, description, category, thumbnail and gallery. To test a tagline before
        you paste it in, the free <Link href="/tools/product-hunt-tagline-checker">Product Hunt tagline checker</Link> counts it against Product Hunt&apos;s limit and flags
        hype words, emoji and, if you add your product name, a repeated name.
      </p>
      <p>
        <strong>Free or paid.</strong> A free tier and three paid tiers, each paid tier with a crossed-out price next to it:
      </p>
      <ul>
        <li>
          <strong>Basic, free.</strong> <q>Reviewed &amp; listed within 30 days</q>, featured on the homepage if selected, and{" "}
          <q>A backlink to our site is required (on your homepage or footer)</q>.
        </li>
        <li>
          <strong>Lite, $29 (crossed out at $39).</strong> Publish now or schedule, no backlink to Fazier required, and a high-authority backlink for the top 3 daily products.
        </li>
        <li>
          <strong>Premium, $49 (crossed out at $69).</strong> Everything in Lite, promotion across Fazier for 15 days and a guaranteed backlink.
        </li>
        <li>
          <strong>Super, $99 (crossed out at $139).</strong> Sponsor placement at the top of the homepage for 15 days.
        </li>
      </ul>
      <p>
        <strong>Audience.</strong> The pages we read don&apos;t give visitor or subscriber numbers.
      </p>
      <p>
        <strong>Rules.</strong> From the <a href={SRC.fazierFaqs}>help center FAQ</a>, you can relaunch, but{" "}
        <q>there must be 6 months gap between launches and your product is improved considerably.</q> The <a href={SRC.fazierTerms}>terms</a> add{" "}
        <q>Content must be accurate, not misleading, not obscene, libelous, hateful, or infringing on any rights.</q>
      </p>

      <h3 id="tiny-startups">Tiny Startups</h3>
      <p>
        <strong>What it is.</strong> From its <a href={SRC.tinyAbout}>About page</a>:{" "}
        <q>Tiny Startups is a startup launch platform, startup directory, and Product Hunt alternative built for indie makers.</q> <q>Launches compete on a weekly
        leaderboard</q>, Monday to Sunday, and the top two each week get a Product of the Week badge.
      </p>
      <p>
        <strong>How to submit.</strong> The <a href={SRC.tinySubmit}>submit form</a> starts from your URL and takes five steps: your URL, your startup, revenue, about you and
        upgrades. <q>Every listing is hand-approved.</q>
      </p>
      <p>
        <strong>Free or paid.</strong> The About page says <q>Launching is free; Skip the queue (£29) puts you in the next Monday batch</q>. Its{" "}
        <a href={SRC.tinyTerms}>terms of service</a> list Skip the queue at a higher price, along with paid upgrades for backlinks, a newsletter feature and an SEO review.
        The submit form&apos;s upgrades step is higher than £29 too: it offers <q>Instant listing + DR 71+ do-follow backlink</q> at £69, described as{" "}
        <q>Your free listing skips the queue, launches this week, and its backlink switches to do-follow.</q> The three disagree, so check the price at checkout. The terms are strict about refunds: <q>All sales are final. We do not offer refunds.</q> If a paid listing is rejected,
        you get a credit for a future submission instead.
      </p>
      <p>
        <strong>Audience.</strong> The About page says launches compete in front of 20,000+ early adopters. The submit page describes a weekly newsletter read by 25k+ startup
        founders.
      </p>
      <p>
        <strong>Rules.</strong>{" "}
        <q>Free submissions enter a review queue and are not guaranteed to be approved or given a specific launch date.</q> Submissions must be real, working products you own or
        may promote. On ranking: <q>Rank is upvotes, nothing else: clicks and reviews never move a listing.</q> And{" "}
        <q>Artificial inflation of votes (bots, purchased votes, coordinated campaigns) is prohibited and will result in removal and account suspension.</q>
      </p>

      <h3 id="microlaunch">Microlaunch</h3>
      <p>
        <strong>What it is.</strong> The FAQ on its <a href={SRC.microlaunchPremium}>Premium page</a> says{" "}
        <q>Microlaunch is where makers launch and grow their products.</q> Instead of one launch day,{" "}
        <q>Your launch campaign runs for 30 days, during which your product is showcased to our community of Tech Makers from around the world.</q>
      </p>
      <p>
        <strong>How to submit.</strong> Sign up, then use the New Launch button on <a href={SRC.microlaunch}>microlaunch.net</a>.
      </p>
      <p>
        <strong>Free or paid.</strong> When we opened New Launch without an account, the launch window offered only Pro Launch, which says{" "}
        <q>Skip the queue, go Live Now or Schedule</q>. That implies a queue, but none of the pages we could read says whether there is a free launch or how long the wait is.
        The Premium page showed Launch Pro at $39 (crossed out at $49, with a discount code) and Launch Plus at $79 (crossed out at $99); the FAQ on the same page gives Pro
        Launch as $49. The launch window also says <q>OSS Projects &amp; Students, get 50% OFF Now.</q>
      </p>
      <p>
        <strong>Rules.</strong> The rules on the site say <q>Products rank over 1 month</q> and <q>Products are onboarded between the 1st-15th</q>, that{" "}
        <q>Only signed users can vote</q>, that <q>Makers can submit multiple products, with a maximum of two ranking per month.</q> and{" "}
        <q>No bots allowed on the platform</q>. Votes can carry feedback or a &ldquo;roast&rdquo;, and{" "}
        <q>Roasts tend to lower your product score while increasing your final rank</q>.
      </p>

      <h2 id="communities">Communities, where you post as yourself</h2>
      <h3 id="peerlist">Peerlist Launchpad</h3>
      <p>
        <strong>What it is.</strong> Peerlist calls itself a professional network for showing your proof of work, and its <a href={SRC.peerlistIntro}>Launchpad</a> is where
        members launch projects. <q>Launch window opens on Monday every week!</q> The <a href={SRC.peerlistFaq}>FAQ</a> lists coding projects, design projects and digital
        products such as templates and UI kits as things you can launch.
      </p>
      <p>
        <strong>How to submit.</strong> <q>Anyone with a Verified Peerlist profile can launch their products on Peerlist Launchpad.</q> You add the project to your profile first,
        and <q>Only projects that are 100% complete are eligible for launching on Launchpad.</q> If you can&apos;t make a Monday, the <a href={SRC.peerlistHowTo}>launch guide</a>{" "}
        says you can schedule the launch ahead.
      </p>
      <p>
        <strong>Free or paid.</strong> The Launchpad pages list no launch fee. Verification is what may cost money: <a href={SRC.peerlistVerification}>the verification page</a>{" "}
        says <q>Workplace verification is free. Identity verification has a minimal fee associate with it.</q> It doesn&apos;t state the fee.
      </p>
      <p>
        <strong>Rules.</strong> From the <a href={SRC.peerlistRules}>rules and guidelines</a>:
      </p>
      <ul>
        <li>
          <strong>No spam.</strong> <q>We have zero tolerance for spamming.</q> That includes messaging members you don&apos;t know with your launch link to ask for upvotes, and
          resharing the link too often on Scroll, Peerlist&apos;s feed.
        </li>
        <li>
          <strong>People, not companies.</strong> <q>Only individual profiles are allowed to launch projects.</q> Agencies can&apos;t launch for clients:{" "}
          <q>SEO marketing agencies are strictly prohibited from launching projects on behalf of their clients or customers.</q>
        </li>
        <li>
          <strong>Don&apos;t ask for upvotes.</strong> Ask for feedback and share on other platforms instead.
        </li>
        <li>
          <strong>Early ranking is random.</strong>{" "}
          <q>For first 2 days (Monday and Tuesday), the projects are in random order to give equal exposure to all the projects launched.</q>
        </li>
        <li>
          <strong>Few backlinks.</strong> <q>No, only the top 5 projects of the week are awarded a backlink.</q>
        </li>
      </ul>

      <h3 id="indie-hackers">Indie Hackers</h3>
      <p>
        <strong>What it is.</strong> From its <a href={SRC.indieHackersAbout}>About page</a>:{" "}
        <q>Indie Hackers is a place where the founders of profitable businesses and side projects can share their stories transparently, and where entrepreneurs can come to read
        and learn from those examples.</q> Its definition of who it is for is broad: <q>You&apos;re an indie hacker if you&apos;ve set out to make money independently.</q>
      </p>
      <p>
        <strong>Free or paid.</strong> No fee for posting is listed.
      </p>
      <p>
        <strong>How to submit, and the rules.</strong> There is no launch button. Its founder&apos;s advice is to post a launch as a milestone on your product page and as
        a forum post that teaches something. Indie Hackers publishes no rulebook, so everything we found about posting there, quoted from its founder&apos;s own advice, is in{" "}
        <Link href={postPath({ slug: "how-to-launch-on-indie-hackers" })}>how to launch on Indie Hackers</Link>.
      </p>

      <h3 id="sideproject">r/SideProject, and other subreddits</h3>
      <p>
        <strong>What it is.</strong> From the <a href={SRC.sideProject}>subreddit</a>&apos;s sidebar:{" "}
        <q>Welcome to r/SideProject, a subreddit for sharing and receiving constructive feedback on side projects.</q> As with r/alphaandbetausers, this is from the{" "}
        <a href={SRC.sideProjectArchive}>Internet Archive&apos;s copy of its rules page</a>, from 28 August 2026, because Reddit blocked our requests. That copy showed the
        sidebar but no numbered rules, so read the live rules before you post.
      </p>
      <p>
        <strong>How to submit.</strong> A link or text post, with a set title format:{" "}
        <q>When submitting a link to a project or startup, please use this format: [Project name] - [Short description].</q> Before you post a link, check your
        page&apos;s share image and tags with the free <Link href="/tools/og-preview">OG image preview</Link>.
      </p>
      <p>
        <strong>Free or paid.</strong> No fee or paid option is listed.
      </p>
      <p>
        Every subreddit sets its own rules on self-promotion, and Reddit has site-wide rules on spam. Before you post in r/SideProject, r/startups or any other subreddit, read{" "}
        <Link href="/how-to-promote-on-reddit">how to promote your app on Reddit</Link>, which quotes them.
      </p>

      <h2 id="choosing">Choosing where to launch</h2>
      <ul>
        <li>
          <strong>Start from what you have.</strong> Only a waitlist: BetaList. A beta people can use: r/alphaandbetausers, Show HN or DevHunt if it is a developer tool, and
          the general boards. A finished product: any of them, but BetaList&apos;s criteria list{" "}
          <q>Launched months or years ago</q> as a common pitfall.
        </li>
        <li>
          <strong>Count the wait.</strong> Uneed&apos;s free line is at least 30 days away, Fazier&apos;s free tier reviews within 30 days, Microlaunch onboards between the
          1st and 15th of the month, and Peerlist launches on Mondays. If your date matters, those are the numbers to plan around, or the paid options that let you pick a date.
        </li>
        <li>
          <strong>Read the link conditions.</strong> A free listing often comes with a nofollow link, a minimum upvote score or a backlink you have to add to your own site.
        </li>
        <li>
          <strong>Never buy or beg for votes.</strong> Uneed, Tiny Startups and Microlaunch ban bought or bot votes, and Show HN and Peerlist ask you not to ask for
          upvotes.
        </li>
      </ul>

      <h2 id="next">Next steps</h2>
      <p>
        Launching on several of these in the same week? Our guides cover the ones with the most to read: <Link href="/how-to-write-a-show-hn-post">how to write a Show HN
        post</Link>, <Link href="/how-to-promote-on-reddit">how to promote your app on Reddit</Link>,{" "}
        <Link href={postPath({ slug: "how-to-launch-on-indie-hackers" })}>how to launch on Indie Hackers</Link>,{" "}
        <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link> and the{" "}
        <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link>. Before you submit, check your tagline with the{" "}
        <Link href="/tools/product-hunt-tagline-checker">tagline checker</Link> and your link&apos;s share card with the <Link href="/tools/og-preview">OG image preview</Link>,
        both free.
      </p>
      <p>
        LaunchLoop isn&apos;t a launch platform. It drafts your launch copy: a LaunchLoop kit writes your Product Hunt listing (name, tagline, description and maker comment),
        landing copy, X thread, LinkedIn post and launch images from your repo and live page. A tagline, a description and images are the same kind of fields boards like Fazier and
        Peerlist ask for, so the kit gives you a draft to adapt for each site. It doesn&apos;t write Show HN, Reddit or Indie Hackers posts. Start with a <Link href="/#start">free preview</Link> or see{" "}
        <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="Product Hunt alternatives: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of October 2026. Quotes were read from each site&apos;s own pages on 20 October 2026, Uneed&apos;s again on 21 October 2026 and BetaList&apos;s on 24
        October 2026 from Internet Archive copies saved that day, except the two subreddits, which came from the Internet Archive&apos;s copies of 24 and 28 August 2026
        because Reddit blocked our requests. We also checked every price again on 21 October 2026, and used the Internet Archive for BetaList because its Cloudflare check
        was blocking some of our requests. Prices and rules on these sites change often, so check each one before you submit or pay.
      </p>
      <ul>
        <li><a href={SRC.devhuntFaq}>DevHunt FAQ</a> and <a href={SRC.devhuntAdvertise}>Advertise on DevHunt</a></li>
        <li><a href={SRC.showHn}>Show HN guidelines</a>, Hacker News</li>
        <li><a href={SRC.betalistHelp}>BetaList Help</a>, <a href={SRC.betalistCriteria}>Submission criteria</a>, <a href={SRC.betalistSubmit}>Submit your startup</a>, <a href={SRC.betalistBoost}>Boost</a> and <a href={SRC.betalistAdvertise}>Advertise</a></li>
        <li><a href={SRC.alphaBetaArchive}>Rules for r/alphaandbetausers</a> (Internet Archive copy, 24 August 2026), for <a href={SRC.alphaBeta}>r/alphaandbetausers</a></li>
        <li><a href={SRC.uneedHowItWorks}>How it works</a>, <a href={SRC.uneedPricing}>Pricing</a> and <a href={SRC.uneedAccept}>What we accept (and what we don&apos;t)</a>, Uneed</li>
        <li><a href={SRC.fazierSubmit}>Submit Product</a>, <a href={SRC.fazierFaqs}>Help Center FAQs</a> and <a href={SRC.fazierTerms}>Terms &amp; Conditions</a>, Fazier</li>
        <li><a href={SRC.tinyAbout}>About</a>, <a href={SRC.tinySubmit}>Launch a startup</a> and <a href={SRC.tinyTerms}>Terms of Service</a>, Tiny Startups</li>
        <li><a href={SRC.microlaunchPremium}>Microlaunch Premium</a>, with its FAQ, and the launch window and rules on <a href={SRC.microlaunch}>microlaunch.net</a></li>
        <li><a href={SRC.peerlistIntro}>What is Peerlist Launchpad?</a>, <a href={SRC.peerlistRules}>Launchpad Rules and Guidelines</a>, <a href={SRC.peerlistHowTo}>How do I launch a project on Peerlist Launchpad?</a>, <a href={SRC.peerlistFaq}>Launchpad FAQ</a> and <a href={SRC.peerlistVerification}>Verification</a>, Peerlist Help Center</li>
        <li><a href={SRC.indieHackersAbout}>About Indie Hackers</a></li>
        <li><a href={SRC.sideProjectArchive}>Rules for r/SideProject</a> (Internet Archive copy, 28 August 2026), for <a href={SRC.sideProject}>r/SideProject</a></li>
      </ul>
    </BlogPostLayout>
  );
}
