import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";
import { OG_PREVIEW } from "@/lib/tools";

const p = post("how-to-launch-on-betalist");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const BL = "https://betalist.com";

const SRC = {
  home: `${BL}/`,
  help: `${BL}/help`,
  criteria: `${BL}/criteria`,
  submitting: `${BL}/help/submitting`,
  agent: `${BL}/agent`,
  submissionTerms: `${BL}/terms/submissions`,
  terms: `${BL}/terms`,
  boost: `${BL}/boost`,
  advertise: `${BL}/advertise`,
  landingGuide: "https://guides.betalist.com/designing-your-landing-page",
} as const;

const OTHERS = {
  phUnreleased: "https://help.producthunt.com/en/articles/484932-can-i-submit-an-unreleased-product",
  phFeaturing: "https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines",
  phSchedule: "https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post",
  phShareScheduled: "https://help.producthunt.com/en/articles/15706445-how-to-share-a-scheduled-launch",
  phHowItWorks: "https://www.producthunt.com/launch/how-product-hunt-works",
  uneedHowItWorks: "https://www.uneed.best/how-it-works",
  uneedAccept: "https://help.uneed.best/common-questions-and-issues/what-we-accept",
  showHn: "https://news.ycombinator.com/showhn.html",
} as const;

const ALTERNATIVES = postPath({ slug: "product-hunt-alternatives" });

const FAQ: FaqItem[] = [
  {
    q: "Is BetaList free?",
    a: "No. BetaList's Help page says all submissions are paid and there is no free submission option. It used to offer free submissions, so older guides that call it free are out of date. If your startup isn't selected, the Help page says you get a full refund automatically.",
  },
  {
    q: "How much does it cost to submit to BetaList?",
    a: "BetaList doesn't publish the price on its public pages. Its Help page says current plans and prices are shown at the end of the submission form. Its Agent API page names three plans, Lite, Standard and Premium, which differ by how quickly you are featured. Boost, an optional extra for startups already featured, is listed publicly at $99 a week or $199 a month (read on 24 October 2026).",
  },
  {
    q: "How long does BetaList take to review and feature a startup?",
    a: "It depends on the plan. BetaList's Agent API page says Lite is featured within about 14 days, Standard within about 3 days and Premium within about 1 day. The Help page says the expected timeline is shown when you choose a plan and in your confirmation email, and the Submission Terms call advertised timeframes a best effort that may vary with volume.",
  },
  {
    q: "What does BetaList reject?",
    a: "Products launched months or years ago, ones with significant press coverage, blogs, courses, books, newsletters, subscription e-commerce, general online stores, consultancies and agencies. It also turns away untouched templates, hosted landing page builders such as Carrd, free hosting subdomains such as vercel.app, direct app store links, and pages where following an account on X is the only way to opt in.",
  },
  {
    q: "Can my startup be featured on BetaList twice?",
    a: "Yes, if the first time was before launch. BetaList's submission criteria say each startup gets up to two opportunities to be featured: once pre-launch and once at launch, with at least a few weeks between them. Otherwise, the Help page says it generally features each startup only once.",
  },
];

export default function BetaListLaunchPostPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        BetaList is a directory of new startups, built for the stretch before and just after launch. To get listed you submit your startup, pay for a plan, and wait for an
        editor to accept or reject it. This post explains how that works using only BetaList&apos;s own pages: its <a href={SRC.help}>Help page</a>,{" "}
        <a href={SRC.criteria}>submission criteria</a>, <a href={SRC.submitting}>submission guide</a>, <a href={SRC.agent}>Agent API page</a>,{" "}
        <a href={SRC.submissionTerms}>Submission Terms</a> and landing page guide. Every rule is quoted and linked, and where BetaList doesn&apos;t say something publicly,
        this post says so instead of guessing. There is a <a href="#checklist">checklist</a> to run through before you submit, and a{" "}
        <a href="#compared">table comparing BetaList with other pre-launch options</a>, also from each site&apos;s own pages.
      </p>

      <h2 id="what-it-is">What BetaList is and who it&apos;s for</h2>
      <p>
        BetaList&apos;s Help page describes it in one sentence: <q>BetaList is the place for early adopters to discover upcoming and recently launched internet startups, and
        for startup founders to share their startup with the world and get early user feedback.</q> The <a href={SRC.home}>homepage</a> puts it more briefly:{" "}
        <q>BetaList helps you find early-stage startups before they make it big.</q>
      </p>
      <p>
        So the audience is early adopters, and the products are early. The Help page again: <q>We feature pre-launch and recently launched startups with a clear value
        proposition, a good design, and an innovative idea.</q> That makes BetaList one of the few places where a waitlist or a private beta is the expected thing to submit,
        not a reason to be turned away. Product Hunt is a poor fit for a bare waitlist, as our{" "}
        <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>Product Hunt launch post</Link> explains, so BetaList can come first and Product Hunt once the
        product is public.
      </p>
      <p>
        BetaList&apos;s <a href={SRC.advertise}>advertising page</a> pitches itself as a way to <q>Promote your product to startup founders and early adopters</q> and states
        70,000+ newsletter subscribers, 500,000+ pageviews per month and 24,000+ startups featured. Those are BetaList&apos;s own figures, and the plan cards on the same page
        say 70k+ subscribers.
      </p>

      <h2 id="what-qualifies">What qualifies, and what gets rejected</h2>
      <p>
        The <a href={SRC.criteria}>submission criteria</a> have five sections, and each gives two lists: <q>Aim for</q> and <q>Common pitfalls</q>. Here they are, with
        BetaList&apos;s wording.
      </p>
      <h3>The product should be new</h3>
      <p>
        <q>BetaList readers come here to discover what&apos;s new. If your product has been live for a while or has already had significant press coverage, it&apos;s not
        really news to them anymore.</q>
      </p>
      <ul>
        <li>
          Aim for: <q>Not yet available to anyone (pre-launch landing page)</q>, <q>Private beta accessible by invitation only</q> and <q>Recently launched</q>, ideally in
          the last few weeks.
        </li>
        <li>
          Common pitfalls: <q>Launched months or years ago</q>, <q>Already received significant press coverage</q> and{" "}
          <q>A familiar product re-released for a different platform without meaningful changes</q>.
        </li>
      </ul>
      <h3>Not featured on BetaList before</h3>
      <p>
        <q>Each startup gets up to two opportunities to be featured: once pre-launch and once at launch. There should be at least a few weeks between the two posts so they
        feel like distinct moments to our audience.</q> So if you submit a waitlist now, you can come back when you launch.
      </p>
      <ul>
        <li>
          Aim for: <q>A pre-launch listing while you&apos;re still in private beta or building anticipation</q> and{" "}
          <q>A launch listing once your product is publicly available</q>.
        </li>
        <li>
          Common pitfalls: <q>Submitting again so soon after a previous feature that nothing has visibly changed</q> and{" "}
          <q>Re-submitting the same launch hoping for a second post</q>.
        </li>
      </ul>
      <h3>A technology startup</h3>
      <p>
        <q>Our audience comes to BetaList specifically to discover new technology startups.</q> Other kinds of products, the page says, tend to do worse there, even good ones.
      </p>
      <ul>
        <li>
          Aim for: <q>Software products (web apps, mobile apps, dev tools, AI tools, etc.)</q>, <q>Hardware products and connected devices</q> and{" "}
          <q>Familiar ideas with a genuinely new twist</q>.
        </li>
        <li>
          Common pitfalls: <q>Blogs, online courses, books, or newsletters</q>, <q>Subscription e-commerce or general online stores</q>,{" "}
          <q>Familiar ideas without substantial improvements over what already exists</q> and <q>Consultancies or agencies</q>.
        </li>
      </ul>
      <h3>A distinct, decent-looking landing page</h3>
      <p>
        This section matters most if you built the page quickly. <q>Generic templates don&apos;t inspire confidence and reliably convert worse than a custom page.</q> BetaList
        adds <q>We&apos;re not expecting world-class design</q>, only a page that is clearly yours and tells visitors enough to decide.
      </p>
      <ul>
        <li>
          Aim for: <q>A distinct design that visibly belongs to your product</q>,{" "}
          <q>A heavily customized template, if you started from one, so it no longer looks templated</q> and <q>Clear product information</q>, which it spells out as{" "}
          <q>what it is, who it&apos;s for, what it looks like</q>.
        </li>
        <li>
          Common pitfalls: <q>An untouched free or paid template</q>, <q>Default Bootstrap or other off-the-shelf framework styles</q>,{" "}
          <q>A page whose only content is an explainer video</q>, <q>Hosted landing-page builders (LaunchRock, Unbounce, KickoffLabs, Carrd, etc.)</q>,{" "}
          <q>Free hosting subdomains like yourapp.vercel.app, yourapp.netlify.app, or yourapp.herokuapp.com</q> and{" "}
          <q>A direct link to App Store, Google Play, Kickstarter, Indiegogo, or a Facebook page instead of a real landing page</q>.
        </li>
      </ul>
      <p>
        The Help page repeats the domain rule: <q>Your startup must have its own domain</q>, and the Submission Terms say{" "}
        <q>We do not accept app store links or pages hosted on free subdomains.</q> If you built your app with an AI builder and it still lives on a vercel.app or similar
        address, put it on your own domain before you submit. Our guide to <Link href="/how-to-launch-a-vibe-coded-app">launching a vibe-coded app</Link> covers the other
        fixes such builders usually skip, like default titles and favicons.
      </p>
      <h3>Visitors should be able to sign up or get access</h3>
      <p>
        <q>The point of being featured is to get people into your product (or onto your waitlist). Make sure that path exists and is easy to find on your landing page.</q>
      </p>
      <ul>
        <li>
          Aim for: <q>A custom email signup form</q>, <q>An embedded form from Mailchimp, ConvertKit, or similar</q>, <q>A download button or app store link</q> and{" "}
          <q>Sign in with Google, Apple, GitHub, etc.</q>
        </li>
        <li>
          Common pitfalls: a <q>Follow us on X to get notified</q> message as the only way to opt in, and <q>A landing page with no clear next step at all</q>.
        </li>
      </ul>
      <p>
        Note the difference between the two app store rules: a download button on your own page is fine, but an app store page can&apos;t be the page you submit.
      </p>
      <h3>Why good startups still get turned down</h3>
      <p>
        Meeting the criteria doesn&apos;t guarantee a place. The Help page: <q>We receive thousands of submissions every month. We prioritize startup submissions that have a
        clear value proposition, have an idea we haven&apos;t seen before, and have a well-designed landing page, because these are the things that our audience is looking
        for.</q> It also says <q>Unfortunately we&apos;re not able to provide specific feedback on individual submissions.</q> The Submission Terms are firmer:{" "}
        <q>Submitting your startup does not guarantee it will be featured. BetaList maintains full editorial and curatorial discretion over which startups are featured, and
        this decision is final.</q>
      </p>
      <p>
        One more rule applies to who submits. <q>Submitting a startup you do not represent, including through affiliate or referral links, is not permitted.</q>
      </p>

      <h2 id="landing-page">Getting the landing page ready</h2>
      <p>
        BetaList also has a guide, <a href={SRC.landingGuide}>Designing your landing page</a>, which it labels <q>Work in progress.</q> It is short, and the parts that matter
        most for a submission are these:
      </p>
      <ul>
        <li>
          <strong>Show the product, even if it isn&apos;t finished.</strong>{" "}
          <q>If your product isn&apos;t ready yet, you should still be able to create a mockup of at least one screen.</q>
        </li>
        <li>
          <strong>Look like yourself.</strong> <q>Don&apos;t use a generic template page.</q>
        </li>
        <li>
          <strong>Make signing up the obvious next step.</strong>{" "}
          <q>The signup form should be front and center. Don&apos;t hide it on another page. Don&apos;t ask for information you don&apos;t need. The email address should be
          enough.</q> For the button, it suggests <q>Since your product isn&apos;t ready yet, &quot;Get early access&quot; will probably do fine.</q>
        </li>
        <li>
          <strong>Answer two questions.</strong> The guide sums up the page&apos;s job as <q>What are you? Why should I care?</q>
        </li>
      </ul>
      <p>
        The page has to work on the day itself, too. The Submission Terms say{" "}
        <q>You are responsible for ensuring your website is live, functioning correctly, and able to handle traffic at the time of featuring.</q>
      </p>

      <h2 id="how-to-submit">How to submit, and what the form asks for</h2>
      <p>From the submission page, the Help page and the Submission Terms, the steps are:</p>
      <ol>
        <li>
          Open the Submit Startup link. The first step asks for your website URL and your email: <q>New here? We create your account on the spot.</q>
        </li>
        <li>Fill in the form, then choose a plan. <q>Current plans and prices are shown at the end of the submission form.</q></li>
        <li>
          Pay. <q>Payment is charged when you choose a plan and complete checkout. Our editorial team then reviews your startup. You&apos;ll get an email with the decision.
          If accepted, we feature it on the timeline for your plan.</q>
        </li>
        <li>Follow the submission from your dashboard, which is where the Help page sends you to check its status.</li>
      </ol>
      <p>
        The same page offers a second route, for founders who use a coding agent:{" "}
        <q>Paste this into your coding agent. It reads our instructions, drafts your submission and sends you a link to review and pay.</q> The instructions are on the{" "}
        <a href={SRC.agent}>Agent API page</a>, which says <q>The agent never pays and cannot publish.</q> You still open the link, review the draft, choose a plan and pay
        yourself.
      </p>
      <p>
        The form itself sits behind the first step, so it wasn&apos;t filled in for this post. Two public pages describe it. BetaList&apos;s{" "}
        <a href={SRC.submitting}>submission guide</a> goes through it field by field, and the Agent API page lists each field&apos;s limit and says{" "}
        <q>Text is validated with the web form&apos;s rules and messages</q>. Together they give:
      </p>
      <ul>
        <li>
          <strong>Website URL</strong> (required, 255 characters). The guide asks for <q>Your home page on your own domain.</q>
        </li>
        <li>
          <strong>Name</strong> (required, 255 characters). <q>Just the product name as it appears on your homepage</q>, with no tagline or extra keywords.
        </li>
        <li>
          <strong>Pitch</strong> (required, 75 characters, one sentence).{" "}
          <q>A single, plain sentence that makes it immediately obvious what your product does.</q>{" "}
          <q>A packed-in pitch is the single most common edit we make</q>.
        </li>
        <li>
          <strong>Description</strong> (required, 700 characters, plain text).{" "}
          <q>One or two short paragraphs of plain prose describing your product, who it&apos;s for, and why it&apos;s worth their time.</q>
        </li>
        <li>
          <strong>Topics</strong> (up to 5). <q>Specific almost always beats generic.</q>
        </li>
        <li>
          <strong>Icon and screenshots</strong> (one icon, up to 5 screenshots). The Agent API page asks for a <q>Square app icon, ideally 512 px or larger.</q> and the
          guide suggests screenshots at <q>Roughly 4:3 aspect ratio</q>. <q>Paying requires an icon and a screenshot</q>, so have both ready.
        </li>
        <li>
          <strong>Optional extras.</strong> A YouTube video, a public TestFlight link, a signup URL if it isn&apos;t your website, and promotion details of about 500
          characters, such as a coupon code.
        </li>
      </ul>
      <p>
        If you need help with the pitch, the advice in <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt tagline</Link> applies to any one-line
        summary.
      </p>
      <p>
        Expect BetaList to edit what you send. The Submission Terms say{" "}
        <q>By submitting, you grant us the right to edit your submission for grammar, clarity, and length; to select, crop, or create images; and to categorize your startup as
        we see fit.</q> They add <q>You retain ownership of your content.</q>
      </p>

      <h2 id="checklist">Before you submit: a readiness checklist</h2>
      <p>Everything on this list comes from the BetaList pages quoted above. Tick each one off before you pay.</p>
      <ul>
        <li>
          <strong>It is new and it is a technology startup.</strong> Pre-launch, in private beta or launched in the last few weeks, and software or hardware rather than a
          blog, course, store or agency. See <a href="#what-qualifies">what qualifies</a>.
        </li>
        <li>
          <strong>It hasn&apos;t been featured, or this is the launch listing.</strong> A startup featured before launch can come back once, at launch.
        </li>
        <li>
          <strong>It is on its own domain.</strong> Not a free subdomain like vercel.app or netlify.app, and not an app store or Kickstarter page.
        </li>
        <li>
          <strong>The landing page looks like yours.</strong> No untouched template, default Bootstrap or hosted builder page, and it says what the product is, who it&apos;s
          for and what it looks like.
        </li>
        <li>
          <strong>There is an obvious way in.</strong> A signup form front and center that asks only for an email, a download button or a social login. &ldquo;Follow us
          on X to get notified&rdquo; on its own doesn&apos;t count.
        </li>
        <li>
          <strong>The form fields are written.</strong> The product name on its own, a one-sentence pitch of 75 characters or fewer, a plain-text description of 700 or
          fewer, and up to 5 specific topics. See <a href="#how-to-submit">the form</a>.
        </li>
        <li>
          <strong>You have an icon and at least one screenshot.</strong> A square icon, ideally 512 px or larger, and screenshots at roughly 4:3. BetaList won&apos;t take
          payment without an icon and a screenshot.
        </li>
        <li>
          <strong>Your page&apos;s share card is right.</strong> Check your page&apos;s share image and tags with the free{" "}
          <Link href={OG_PREVIEW.path}>OG image preview</Link> before you submit, so your link looks right wherever you share it on the day.
        </li>
        <li>
          <strong>The site can take traffic on any day.</strong> Unless your plan lets you pick a date, you won&apos;t know the day in advance, and it can be a weekend.
        </li>
        <li>
          <strong>Analytics can see BetaList.</strong> BetaList adds UTM parameters and ref=betalist to its links, so check that your analytics records the source.
        </li>
        <li>
          <strong>You know what the plan buys.</strong> Paying buys a faster review, not acceptance, and if you aren&apos;t selected the Help page says you get a full
          refund. Then watch your inbox, because BetaList expects a prompt reply if it contacts you.
        </li>
      </ul>

      <h2 id="pricing">What it costs</h2>
      <p>
        Submitting to BetaList is paid. On 24 October 2026 the Help page said <q>All submissions are paid. There is no free submission option.</q> and{" "}
        <q>BetaList used to offer free submissions, but all submissions now require payment.</q> Guides that still describe a free queue are out of date.
      </p>
      <p>
        The price itself isn&apos;t on any public BetaList page. The Help page says only <q>Current plans and prices are shown at the end of the submission form.</q> and the
        Agent API page says <q>prices are shown when the founder picks one</q>. Reaching that point means starting a submission with your email, and none was started for this post, so it doesn&apos;t give a figure. What
        the public pages do say about the plans:
      </p>
      <ul>
        <li>
          <strong>There are three, named by speed.</strong> The Agent API page:{" "}
          <q>Lite: featured within about 14 days. Standard: featured within about 3 days. Premium: featured within about 1 day.</q>
        </li>
        <li>
          <strong>They differ in speed and the newsletter.</strong>{" "}
          <q>Plans differ mainly by how quickly your startup is featured and whether newsletter inclusion is guaranteed.</q> No public page says which plans guarantee it.
        </li>
        <li>
          <strong>Every plan gets the same basics.</strong>{" "}
          <q>All plans include a do-follow backlink if featured, and a full refund if not selected. All submissions must still meet our submission guidelines.</q>
        </li>
        <li>
          <strong>You can upgrade later.</strong>{" "}
          <q>If you&apos;ve already submitted on a lower plan and want faster featuring or newsletter inclusion, you can upgrade from your dashboard.</q>
        </li>
        <li>
          <strong>Paying buys speed, not acceptance.</strong> The Submission Terms describe priority listing:{" "}
          <q>Priority listing is a paid service that moves your submission to the front of the review queue.</q> And:{" "}
          <q>Priority listing guarantees faster review, not acceptance or any specific results.</q>
        </li>
        <li>
          <strong>Some submissions can pick a date.</strong> <q>Premium submissions can pick a preferred date of featuring, subject to availability.</q> Premium is also the
          name of the fastest plan on the Agent API page.
        </li>
      </ul>
      <h3>Refunds</h3>
      <p>
        The Help page says: <q>If your startup is not selected, you will receive a full refund automatically. Once your startup has been featured, refunds are not
        available.</q> It says a refund can take 5 to 10 business days to reach your statement. The Submission Terms are more guarded. They say{" "}
        <q>If your priority listing submission is not accepted for featuring, you are generally eligible for a refund.</q> They also say{" "}
        <q>Refunds are provided at BetaList&apos;s discretion.</q> and <q>Refunds may be issued minus payment processing fees at our discretion.</q> They reserve the right to
        limit or deny refunds in some cases, including repeated rejected submissions, so it pays to check the criteria before you submit rather than after.
      </p>
      <h3>Boost and sponsorship</h3>
      <p>
        Once you have been featured, <a href={SRC.boost}>Boost</a> keeps your startup on the homepage and in the newsletter. On 24 October 2026 it cost $99 a week or $199 a
        month, both cancel anytime, marked <q>Introductory pricing</q>. <q>Your startup appears in the &quot;Boosted&quot; section on the BetaList homepage, rotated among
        active boosts.</q> It is only for startups already featured: <q>Yes, boosts are available for startups that have been featured on BetaList.</q> The advertising page
        also lists a sponsorship at $4,999 a month, one sponsor at a time, and an advertising tier also called Premium at $9,999 a month, which adds homepage placement above
        the fold and one dedicated email a month to all 70k+ subscribers. The Help page points startups that don&apos;t fit the criteria there:{" "}
        <q>If you don&apos;t match the guidelines or want additional exposure you can have a look at our advertising packages.</q>
      </p>

      <h2 id="review">Review and wait times</h2>
      <p>
        The Help page ties the wait to your plan: <q>It depends on the plan you paid for. The expected timeline is shown when you choose a plan and in your confirmation
        email.</q> The Agent API page gives rough figures for each plan, quoted under pricing above, and says <q>A human reviews within the plan&apos;s time frame.</q> The
        submission guide is blunter: <q>Most submissions wait days or weeks before publishing, so dated offers often expire before they go live.</q> The Submission Terms add
        a caveat: <q>Advertised timeframes for featuring represent our best effort and may vary based on volume and other factors.</q> The Agent API page agrees:{" "}
        <q>Do not promise a date: every paid submission is reviewed and declined ones are refunded.</q>
      </p>
      <p>
        While you wait, watch your inbox. <q>If we contact you regarding your submission, you are responsible for responding promptly.</q> If the answer is no, the Help page
        says you can resubmit after improving and advises: <q>Focus on improving your value proposition, design, and uniqueness before resubmitting.</q>
      </p>

      <h2 id="featured-day">What happens on the day you&apos;re featured</h2>
      <p>
        Unless your plan lets you pick a date, you won&apos;t know the day in advance. The Submission Terms:{" "}
        <q>Otherwise, you cannot choose the exact date of featuring, and your startup may be featured on any day including weekends and holidays.</q> Keep the page ready from
        the day you pay.
      </p>
      <ul>
        <li>
          <strong>It is one day on the front page, alongside others.</strong> The criteria page says <q>We feature around 20 new startups every day.</q> The Boost page
          describes being featured as a one-time event in which <q>your startup appears on BetaList for a day and then moves down the list.</q>
        </li>
        <li>
          <strong>Engagement decides Trending.</strong> <q>The Trending Startups section on the homepage showcases the most popular, recently featured startups.</q> And:{" "}
          <q>We take a few metrics in mind, including how many tweets a startup post has received. We&apos;re not disclosing the exact algorithm, but the more engagement your
          startup post receives, the higher its chances of getting trending.</q> So sharing your BetaList post on the day can help it.
        </li>
        <li>
          <strong>Without a guaranteed slot, the newsletter waits at least a day.</strong> If your plan doesn&apos;t guarantee it:{" "}
          <q>When it isn&apos;t guaranteed, the newsletter only includes the most popular featured startups. It takes at least 24 hours between a startup getting featured and
          being included in the newsletter so we can fairly determine popularity.</q>
        </li>
        <li>
          <strong>Your link is tracked and followed.</strong> <q>The &quot;Visit Site&quot; button on your featured listing is a do-follow link</q>, and{" "}
          <q>It routes through a 301 redirect to your website so we can track clicks and add ref=betalist attribution.</q> BetaList also says{" "}
          <q>We automatically add UTM tracking parameters to links to your website, so you can track traffic from BetaList using Google Analytics or similar tools.</q> Look
          for the source &ldquo;betalist&rdquo; in your analytics.
        </li>
        <li>
          <strong>BetaList controls the listing.</strong> <q>We may also change how your startup is presented on our platform, including design, layout, and link attributes,
          without notice.</q> And <q>Submissions that are misleading, fraudulent, or otherwise violate these terms may be rejected or removed at any time.</q>
        </li>
        <li>
          <strong>Expect sales emails.</strong> <q>If you receive sales or promotional emails after being featured, it&apos;s likely because service providers scrape startup
          directories (including BetaList) for leads and find publicly available contact information on your own website or social media profiles.</q>
        </li>
      </ul>
      <p>
        None of the BetaList pages above sets upvote or launch-day conduct rules like Product Hunt&apos;s. Its rules are the criteria and terms already quoted.
      </p>

      <h2 id="after">After you&apos;re featured</h2>
      <ul>
        <li>
          <strong>Keep the listing current.</strong> You request changes from your dashboard, and{" "}
          <q>Most edits are approved automatically within minutes; the rest are reviewed by our team.</q> If you move domains,{" "}
          <q>The one rule for moving to a new domain is that your old URL must redirect to your new one</q>.
        </li>
        <li>
          <strong>Come back at launch.</strong> The Help page says <q>We generally only feature each startup once, with one exception</q>: a startup featured before launch
          can be featured again when it launches.
        </li>
        <li>
          <strong>Launch publicly elsewhere.</strong> BetaList is the early step. When the product is public, Product Hunt, Show HN and the communities you belong to are the
          next ones.
        </li>
      </ul>

      <h2 id="not-documented">What BetaList doesn&apos;t say publicly</h2>
      <p>
        A few things founders ask about aren&apos;t on BetaList&apos;s public pages, so this post leaves them out: the submission prices, which plans guarantee a newsletter
        slot, and how Trending is calculated beyond what is quoted above.
      </p>
      <p>
        Other things that guides often list as unknown are now published, and quoted above with their sources: the plan names and rough featuring times and the form&apos;s
        field limits on the <a href={SRC.agent}>Agent API page</a>, the form&apos;s fields in the <a href={SRC.submitting}>submission guide</a>, and how many startups are
        featured each day in the <a href={SRC.criteria}>submission criteria</a>.
      </p>

      <h2 id="compared">BetaList vs other pre-launch options</h2>
      <p>
        BetaList is built for products that aren&apos;t public yet. Here is how it compares with Product Hunt&apos;s scheduled launches and with two sites from our{" "}
        <Link href={ALTERNATIVES}>Product Hunt alternatives</Link> post, Uneed and Show HN, that founders often try early. Each cell comes from that site&apos;s own pages.
      </p>
      <div className="@container">
        {/* The table's min width is 40rem, so the hint only shows while the table is wider than its column. */}
        <p className="mb-2 text-xs @min-[40rem]:hidden" aria-hidden="true" data-testid="compared-scroll-hint">
          Scroll sideways to see all columns →
        </p>
        <div
          className="overflow-x-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          tabIndex={0}
          role="region"
          aria-label="Comparison table: BetaList vs other pre-launch options"
        >
          <table className="w-full min-w-[40rem] text-left text-sm text-muted-foreground">
            <caption className="sr-only">Pre-launch options compared: BetaList, Product Hunt&apos;s scheduled launch, Uneed and Show HN</caption>
            <thead>
              <tr className="border-b border-border text-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">Site</th>
                <th scope="col" className="py-2 pr-4 font-medium">Takes a pre-launch page?</th>
                <th scope="col" className="py-2 pr-4 font-medium">Price</th>
                <th scope="col" className="py-2 pr-4 font-medium">Wait</th>
                <th scope="col" className="py-2 font-medium">Link to your site</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <th scope="row" className="py-2 pr-4 align-top font-normal">BetaList</th>
                <td className="py-2 pr-4 align-top">Yes, with a way to sign up</td>
                <td className="py-2 pr-4 align-top">Paid only; prices shown at the end of the form; full refund if not selected</td>
                <td className="py-2 pr-4 align-top">About 14, 3 or 1 days to be featured, by plan</td>
                <td className="py-2 align-top">Do-follow if featured, through a 301 redirect</td>
              </tr>
              <tr className="border-b border-border">
                <th scope="row" className="py-2 pr-4 align-top font-normal">Product Hunt, scheduled launch</th>
                <td className="py-2 pr-4 align-top">Occasionally; an email sign-up alone isn&apos;t eligible for the homepage</td>
                <td className="py-2 pr-4 align-top">Free</td>
                <td className="py-2 pr-4 align-top">You pick a day within 30 days</td>
                <td className="py-2 align-top">Not stated in its help center</td>
              </tr>
              <tr className="border-b border-border">
                <th scope="row" className="py-2 pr-4 align-top font-normal">Uneed</th>
                <td className="py-2 pr-4 align-top">No: not behind a waitlist or invite code, even on a paid launch</td>
                <td className="py-2 pr-4 align-top">Free line; Fast-track $14.99; Skip the waiting line $39.99</td>
                <td className="py-2 pr-4 align-top">Free: at least 30 days; Fast-track: about 2 weeks; Skip: you pick the date</td>
                <td className="py-2 align-top">Free: do-follow from an upvote score of 20; Fast-track: from 10; Skip: always</td>
              </tr>
              <tr>
                <th scope="row" className="py-2 pr-4 align-top font-normal">Show HN</th>
                <td className="py-2 pr-4 align-top">No: no landing pages or sign-up pages</td>
                <td className="py-2 pr-4 align-top">No fee listed</td>
                <td className="py-2 pr-4 align-top">No review step described</td>
                <td className="py-2 align-top">Not stated in its guidelines</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p>Checked on 25 October 2026.</p>
      <ul>
        <li>
          <strong>BetaList.</strong> The sources are quoted above: the <a href="#what-qualifies">criteria</a>, the plans under <a href="#pricing">pricing</a>, and the Help
          page&apos;s <q>All plans include a do-follow backlink if featured, and a full refund if not selected.</q>
        </li>
        <li>
          <strong>Product Hunt.</strong> It has no coming soon or upcoming page: on 25 October 2026 producthunt.com/upcoming returned a 404 and /coming-soon showed the
          homepage. What it has is a <a href={OTHERS.phSchedule}>scheduled launch</a>, for a day within 30 days, which{" "}
          <q>will not be indexed on the site, and no users will be able to upvote it until the scheduled time.</q> It is private until you{" "}
          <a href={OTHERS.phShareScheduled}>make it public</a>. On <a href={OTHERS.phUnreleased}>unreleased products</a>:{" "}
          <q>We prioritize fully launched products that users can explore and engage with immediately.</q> and{" "}
          <q>Products that only offer an email sign-up are not eligible for the homepage.</q> The <a href={OTHERS.phFeaturing}>Featuring Guidelines</a> don&apos;t feature{" "}
          <q>Waitlisted products (unless immediate access is provided)</q>, and <a href={OTHERS.phHowItWorks}>How Product Hunt works</a> says{" "}
          <q>Product Hunt is free for everyone to use.</q> We found no help center article on review times or link attributes.
        </li>
        <li>
          <strong>Uneed.</strong> Prices, waits and link rules are from its <a href={OTHERS.uneedHowItWorks}>how it works</a> page; on the free line, a score of 10 to 19
          keeps the product published with a nofollow link. Its page on <a href={OTHERS.uneedAccept}>what it accepts</a> says{" "}
          <q>If it&apos;s behind a waitlist, an invite code, or a sales call, we can&apos;t review it</q>, and closed or invite-only products are refused even on a paid
          launch, with a refund.
        </li>
        <li>
          <strong>Show HN.</strong> The <a href={OTHERS.showHn}>guidelines</a> say <q>Don&apos;t post landing pages or fundraisers.</q> They list no fee, describe no
          review step and say nothing about links.
        </li>
      </ul>
      <p>
        The alternatives post also covers r/alphaandbetausers, a subreddit for beta testers, but Reddit blocked our requests on 25 October 2026, so it isn&apos;t in the
        table. LaunchLoop, which publishes this post, isn&apos;t either: it isn&apos;t a launch board.
      </p>

      <h2 id="next">Next steps</h2>
      <p>
        Planning the public launch after BetaList? Start with <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link> and the{" "}
        <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link>. For Hacker News, read{" "}
        <Link href="/how-to-write-a-show-hn-post">how to write a Show HN post</Link>. For communities, see{" "}
        <Link href="/how-to-promote-on-reddit">how to promote your app on Reddit</Link> and{" "}
        <Link href={postPath({ slug: "how-to-launch-on-indie-hackers" })}>how to launch on Indie Hackers</Link>.
      </p>
      <p>
        A LaunchLoop kit drafts a tagline, a description and launch images from your repo and live page, which you can adapt for your BetaList listing. It doesn&apos;t submit
        anything for you: you still create your BetaList account, fill in the form and choose a plan yourself. Start with a <Link href="/#start">free preview</Link> or see{" "}
        <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="Launching on BetaList: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of October 2026. Every BetaList quote and price on this page was read on BetaList&apos;s own pages on 24 October 2026 and found unchanged on 25 October
        2026. The submission guide was read again on 26 October 2026. The comparison table&apos;s Product Hunt, Uneed and Show HN facts were read on those sites&apos; own pages on 25 October 2026. These sites change their plans
        and pages without notice, so check the links before you submit.
      </p>
      <ul>
        <li><a href={SRC.help}>Help</a>, BetaList (betalist.com/support and betalist.com/faq redirect here)</li>
        <li><a href={SRC.criteria}>Submission criteria</a>, BetaList (also at betalist.com/criteria.md)</li>
        <li><a href={SRC.submitting}>How to write a great submission</a>, BetaList</li>
        <li><a href={SRC.agent}>Agent API</a>, BetaList</li>
        <li><a href={SRC.submissionTerms}>Submission Terms</a>, BetaList</li>
        <li><a href={SRC.terms}>Terms of Service</a>, BetaList</li>
        <li><a href={SRC.boost}>Boost your startup</a>, BetaList</li>
        <li><a href={SRC.advertise}>Advertise on BetaList</a></li>
        <li><a href={SRC.landingGuide}>Designing your landing page</a>, BetaList guides</li>
        <li><a href={SRC.home}>BetaList homepage</a></li>
        <li>
          <a href={OTHERS.phUnreleased}>Can I submit an unreleased product?</a>, <a href={OTHERS.phFeaturing}>Featuring Guidelines</a>,{" "}
          <a href={OTHERS.phSchedule}>How to schedule a post</a> and <a href={OTHERS.phShareScheduled}>How to share a scheduled launch</a>, Product Hunt Help Center, and{" "}
          <a href={OTHERS.phHowItWorks}>How Product Hunt works</a>
        </li>
        <li><a href={OTHERS.uneedHowItWorks}>How it works</a> and <a href={OTHERS.uneedAccept}>What we accept (and what we don&apos;t)</a>, Uneed</li>
        <li><a href={OTHERS.showHn}>Show HN guidelines</a>, Hacker News</li>
      </ul>
    </BlogPostLayout>
  );
}
