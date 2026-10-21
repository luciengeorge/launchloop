import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostLayout } from "@/components/blog-post-layout";
import { Faq, type FaqItem } from "@/components/guide-faq";
import { BLOG_POSTS, post, postPath } from "@/lib/blog";
import { postPage } from "@/lib/pages";
import { blogPageMetadata } from "@/lib/seo";

const p = post("how-to-launch-on-betalist");

export const metadata: Metadata = blogPageMetadata(postPage(p));

const BL = "https://betalist.com";

const SRC = {
  home: `${BL}/`,
  faq: `${BL}/support`,
  criteria: `${BL}/criteria`,
  submissionTerms: `${BL}/terms/submissions`,
  terms: `${BL}/terms`,
  boost: `${BL}/boost`,
  advertise: `${BL}/advertise`,
  landingGuide: "https://guides.betalist.com/designing-your-landing-page",
} as const;

const ALTERNATIVES = BLOG_POSTS.find((b) => b.slug === "product-hunt-alternatives");

const FAQ: FaqItem[] = [
  {
    q: "Is BetaList free?",
    a: "No. BetaList's FAQ says all submissions are paid and there is no free submission option. It used to offer free submissions, so older guides that call it free are out of date. If your startup isn't selected, the FAQ says you get a full refund automatically.",
  },
  {
    q: "How much does it cost to submit to BetaList?",
    a: "BetaList doesn't publish the price on its public pages. Its FAQ says current plans and prices are shown at the end of the submission form, which you reach after signing in. The plans differ mainly by how quickly you are featured and whether newsletter inclusion is guaranteed. Boost, an optional extra for startups already featured, is listed publicly at $99 a week or $199 a month (read on 21 October 2026).",
  },
  {
    q: "How long does BetaList take to review and feature a startup?",
    a: "It depends on the plan. The FAQ says the expected timeline is shown when you choose a plan and in your confirmation email, and the Submission Terms call advertised timeframes a best effort that may vary with volume. BetaList's public pages give no number of days.",
  },
  {
    q: "What does BetaList reject?",
    a: "Products launched weeks ago or longer, ones with significant press coverage, blogs, courses, books, newsletters, subscription e-commerce, consultancies and agencies. It also turns away template or builder-hosted landing pages, free hosting subdomains such as vercel.app, direct app store links, and pages where visitors can only follow an account on X instead of signing up.",
  },
  {
    q: "Can my startup be featured on BetaList twice?",
    a: "Yes, if the first time was before launch. BetaList's guidelines say each startup gets two opportunities to be featured: once pre-launch and once during launch, with at least a few weeks between them. Otherwise, the FAQ says it generally features each startup only once.",
  },
];

export default function BetaListLaunchPostPage() {
  return (
    <BlogPostLayout post={p}>
      <p>
        BetaList is a directory of new startups, built for the stretch before and just after launch. To get listed you submit your startup, pay for a plan, and wait for an
        editor to accept or reject it. This post explains how that works using only BetaList&apos;s own pages: its <a href={SRC.faq}>FAQ</a>,{" "}
        <a href={SRC.criteria}>submission guidelines</a>, <a href={SRC.submissionTerms}>Submission Terms</a> and landing page guide. Every rule is quoted and linked, and where
        BetaList doesn&apos;t say something publicly, this post says so instead of guessing.
      </p>

      <h2 id="what-it-is">What BetaList is and who it&apos;s for</h2>
      <p>
        BetaList&apos;s FAQ describes it in one sentence: <q>BetaList is the place for early adopters to discover upcoming and recently launched internet startups, and for
        startup founders to share their startup with the world and get early user feedback.</q> The <a href={SRC.home}>homepage</a> puts it more briefly:{" "}
        <q>BetaList helps you find early-stage startups before they make it big.</q>
      </p>
      <p>
        So the audience is early adopters, and the products are early. The FAQ again: <q>We feature pre-launch and recently launched startups with a clear value proposition, a
        good design, and an innovative idea.</q> That makes BetaList one of the few places where a waitlist or a private beta is the expected thing to submit, not a reason to
        be turned away. Product Hunt is a poor fit for a bare waitlist, as our <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>Product Hunt launch post</Link>{" "}
        explains, so BetaList can come first and Product Hunt once the product is public.
      </p>
      <p>
        BetaList&apos;s <a href={SRC.advertise}>advertising page</a> pitches itself as a way to <q>Promote your product to startup founders and early adopters</q> and states
        70,000+ newsletter subscribers, 500,000+ pageviews per month and 24,000+ startups featured. Those are BetaList&apos;s own figures; the plan cards on the same page say
        60k+ newsletter subscribers.
      </p>

      <h2 id="what-qualifies">What qualifies, and what gets rejected</h2>
      <p>
        The <a href={SRC.criteria}>submission guidelines</a> have five sections. Under most of them the page gives two lists: what fits, and, in red beneath it, what
        doesn&apos;t. Here they are, with BetaList&apos;s wording.
      </p>
      <h3>The product should be new</h3>
      <p>
        <q>Your product should be recently launched or still be unreleased.</q> And: <q>If your product has already received significant press coverage, it may be less suitable
        for our audience.</q>
      </p>
      <ul>
        <li>Fits: <q>Not available to anyone yet</q>, <q>Private beta accessible by invitation only</q> and <q>Recently launched</q>.</li>
        <li>
          Doesn&apos;t: <q>Launched weeks ago or longer</q>, <q>Already received significant press coverage</q> and{" "}
          <q>App with the same functionality as a previously released app for different platform</q>.
        </li>
      </ul>
      <h3>Not featured on BetaList before</h3>
      <p>
        <q>Each startup gets two opportunities to be featured. Once pre-launch, and once during launch. There should be at least a few weeks between those posts.</q> So if you
        submit a waitlist now, you can come back when you launch.
      </p>
      <h3>A technology startup</h3>
      <p>
        <q>Our audience visits BetaList to discover new technology startups. It&apos;s not the right place to promote your blog, newsletter, online store, etc.</q>
      </p>
      <ul>
        <li>Fits: <q>Software startups</q>, <q>Hardware startups</q> and <q>Old ideas with a new twist</q>.</li>
        <li>
          Doesn&apos;t: <q>Blogs, online courses, books, newsletters</q>, <q>Subscription e-commerce</q>, <q>Old ideas without substantial improvements</q> and{" "}
          <q>Consultancies / Agencies</q>.
        </li>
      </ul>
      <h3>A distinct, decent-looking landing page</h3>
      <p>
        This section matters most if you built the page quickly. <q>Using a template doesn&apos;t inspire confidence and result in less sign ups than expected. For this
        reason we do not allow templates or pages with little product information.</q>
      </p>
      <ul>
        <li>Fits: <q>Distinct design showcasing your (upcoming) product</q> and <q>Heavily customised template that looks original</q>.</li>
        <li>
          Doesn&apos;t: <q>Free or paid template</q>, <q>Default Bootstrap style</q>, <q>Page with only an &apos;explainer video&apos;</q>,{" "}
          <q>Hosted page by LaunchRock, Unbounce, KickoffLabs, or similar service</q>,{" "}
          <q>Free hosting subdomains (e.g., yourapp.vercel.app, yourapp.netlify.app, yourapp.herokuapp.com)</q> and{" "}
          <q>Direct link to App Store, Google Play, Kickstarter, Indiegogo, or Facebook page</q>.
        </li>
      </ul>
      <p>
        The FAQ repeats the domain rule: <q>Your startup must have its own domain</q>, and the Submission Terms say{" "}
        <q>We do not accept app store links or pages hosted on free subdomains.</q> If you built your app with an AI builder and it still lives on a vercel.app or similar
        address, put it on your own domain before you submit. Our guide to <Link href="/how-to-launch-a-vibe-coded-app">launching a vibe-coded app</Link> covers the other
        fixes such builders usually skip, like default titles and favicons.
      </p>
      <h3>Visitors should be able to sign up or get access</h3>
      <p>
        <q>There&apos;s no point in getting featured on BetaList if our audience can&apos;t engage with your product. We recommend making it easy for visitors to sign up,
        download, or login to your product.</q>
      </p>
      <ul>
        <li>
          Fits: <q>Custom email signup form</q>, <q>MailChimp or other form</q>, <q>Download button or app store link</q> and{" "}
          <q>Facebook, Google, or LinkedIn login</q>.
        </li>
        <li>Doesn&apos;t: <q>&quot;Follow us on X to get notified&quot;</q>.</li>
      </ul>
      <p>
        Note the difference between the two app store rules: a download button on your own page is fine, but an app store page can&apos;t be the page you submit.
      </p>
      <h3>Why good startups still get turned down</h3>
      <p>
        Meeting the guidelines doesn&apos;t guarantee a place. The FAQ: <q>We receive thousands of submissions every month. We prioritize startup submissions that have a clear
        value proposition, have an idea we haven&apos;t seen before, and have a well-designed landing page, because these are the things that our audience is looking for.</q>{" "}
        It also says <q>Unfortunately we&apos;re not able to provide specific feedback on individual submissions.</q> The Submission Terms are firmer:{" "}
        <q>Submitting your startup does not guarantee it will be featured. BetaList maintains full editorial and curatorial discretion over which startups are featured, and
        this decision is final.</q>
      </p>
      <p>
        One more rule applies to who submits. <q>Submitting a startup you do not represent, including through affiliate or referral links, is not permitted.</q>
      </p>

      <h2 id="landing-page">Getting the landing page ready</h2>
      <p>
        BetaList links its guidelines to a guide, <a href={SRC.landingGuide}>Designing your landing page</a>, which it labels <q>Work in progress.</q> It is short, and the
        parts that matter most for a submission are these:
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
          <q>The sign up form should be front and center. Don&apos;t hide it on another page. Don&apos;t ask for information you don&apos;t need. The email address should be
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
      <p>From the FAQ and Submission Terms, the steps are:</p>
      <ol>
        <li>
          Create an account. The FAQ: <q>Visit the homepage and click the sign up button at the top right.</q>
        </li>
        <li>Open the submission form from the Submit Startup link. Signed out, it sends you to the sign-in page.</li>
        <li>Fill in the form, then choose a plan. <q>Current plans and prices are shown at the end of the submission form.</q></li>
        <li>
          Pay. <q>Payment is charged when you choose a plan and complete checkout. Our editorial team then reviews your startup. You&apos;ll get an email with the decision.
          If accepted, we feature it on the timeline for your plan.</q>
        </li>
        <li>Follow the submission from your dashboard, which is where the FAQ sends you to check its status.</li>
      </ol>
      <p>
        Because the form sits behind sign-in, its exact fields couldn&apos;t be read for this post. The FAQ does say what a listing is made of, in its answer on editing one:{" "}
        <q>You can update the icon, name, pitch, description, website URL, and images.</q> So have those ready: an icon, the name, a one-line pitch, a description, the URL of
        your own domain and a few images. BetaList doesn&apos;t publish length limits for any of them. If you need help with the pitch, the advice in{" "}
        <Link href="/how-to-write-a-product-hunt-tagline">how to write a Product Hunt tagline</Link> applies to any one-line summary.
      </p>
      <p>
        Expect BetaList to edit what you send. The Submission Terms say{" "}
        <q>By submitting, you grant us the right to edit your submission for grammar, clarity, and length; to select, crop, or create images; and to categorize your startup as
        we see fit.</q> They add <q>You retain ownership of your content.</q>
      </p>

      <h2 id="pricing">What it costs</h2>
      <p>
        Submitting to BetaList is paid. On 21 October 2026 the FAQ said <q>All submissions are paid. There is no free submission option.</q> and{" "}
        <q>BetaList used to offer free submissions, but all submissions now require payment.</q> Guides that still describe a free queue are out of date.
      </p>
      <p>
        The price itself isn&apos;t on any public BetaList page. The FAQ says only <q>Current plans and prices are shown at the end of the submission form.</q> The form needs
        an account, so this post doesn&apos;t give a figure. What the public pages do say about the plans:
      </p>
      <ul>
        <li>
          <strong>They differ in speed and the newsletter.</strong>{" "}
          <q>Plans differ mainly by how quickly your startup is featured and whether newsletter inclusion is guaranteed.</q>
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
          <strong>Some submissions can pick a date.</strong> <q>Premium submissions can pick a preferred date of featuring, subject to availability.</q> The public pages
          don&apos;t say which plan in the form carries that name.
        </li>
      </ul>
      <h3>Refunds</h3>
      <p>
        The FAQ says: <q>If your startup is not selected, you will receive a full refund automatically. Once your startup has been featured, refunds are not
        available.</q> It says a refund can take 5 to 10 business days to reach your statement. The Submission Terms are more guarded. They say{" "}
        <q>If your priority listing submission is not accepted for featuring, you are generally eligible for a refund.</q> but also{" "}
        <q>Refunds are provided at BetaList&apos;s discretion.</q> and <q>Refunds may be issued minus payment processing fees at our discretion.</q> They reserve the right to
        limit or deny refunds in some cases, including repeated rejected submissions, so it pays to check the guidelines before you submit rather than after.
      </p>
      <h3>Boost and sponsorship</h3>
      <p>
        Once you have been featured, <a href={SRC.boost}>Boost</a> keeps your startup on the homepage and in the newsletter. On 21 October 2026 it cost $99 a week or $199 a
        month, both cancel anytime, marked <q>Introductory pricing</q>. <q>Your startup appears in the &quot;Boosted&quot; section on the BetaList homepage, rotated among
        active boosts.</q> It is only for startups already featured: <q>Yes, boosts are available for startups that have been featured on BetaList.</q> The advertising page
        also lists a sponsorship at $4,999 a month, one sponsor at a time. The FAQ points startups that don&apos;t fit the guidelines there:{" "}
        <q>If you don&apos;t match the guidelines or want additional exposure you can have a look at our advertising packages.</q>
      </p>

      <h2 id="review">Review and wait times</h2>
      <p>
        BetaList doesn&apos;t publish a number of days. The FAQ ties it to your plan: <q>It depends on the plan you paid for. The expected timeline is shown when you choose a
        plan and in your confirmation email.</q> The Submission Terms add a caveat:{" "}
        <q>Advertised timeframes for featuring represent our best effort and may vary based on volume and other factors.</q>
      </p>
      <p>
        While you wait, watch your inbox. <q>If we contact you regarding your submission, you are responsible for responding promptly.</q> If the answer is no, the FAQ says
        you can resubmit after improving and advises: <q>Focus on improving your value proposition, design, and uniqueness before resubmitting.</q>
      </p>

      <h2 id="featured-day">What happens on the day you&apos;re featured</h2>
      <p>
        Unless your plan lets you pick a date, you won&apos;t know the day in advance. The Submission Terms:{" "}
        <q>Otherwise, you cannot choose the exact date of featuring, and your startup may be featured on any day including weekends and holidays.</q> Keep the page ready from
        the day you pay.
      </p>
      <ul>
        <li>
          <strong>It is one day on the front page.</strong> The Boost page describes being featured as a one-time event in which{" "}
          <q>your startup appears on BetaList for a day and then moves down the list.</q>
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
        None of the BetaList pages above sets upvote or launch-day conduct rules like Product Hunt&apos;s. Its rules are the guidelines and terms already quoted.
      </p>

      <h2 id="after">After you&apos;re featured</h2>
      <ul>
        <li>
          <strong>Keep the listing current.</strong> You request changes from your dashboard, and{" "}
          <q>Most edits are approved automatically within minutes; the rest are reviewed by our team.</q> If you move domains,{" "}
          <q>The one rule for moving to a new domain is that your old URL must redirect to your new one</q>.
        </li>
        <li>
          <strong>Come back at launch.</strong> The FAQ says <q>We generally only feature each startup once, with one exception</q>: a startup featured before launch can be
          featured again when it launches.
        </li>
        <li>
          <strong>Launch publicly elsewhere.</strong> BetaList is the early step. When the product is public, Product Hunt, Show HN and the communities you belong to are the
          next ones.
        </li>
      </ul>

      <h2 id="not-documented">What BetaList doesn&apos;t say publicly</h2>
      <p>
        Several things founders ask about aren&apos;t on BetaList&apos;s public pages, so this post leaves them out: the submission prices and plan names, the form&apos;s exact
        fields and any length limits, review times in days, how many startups are featured each day, and how Trending is calculated beyond what is quoted above.
      </p>

      <h2 id="next">Next steps</h2>
      <p>
        Planning the public launch after BetaList? Start with <Link href={postPath({ slug: "how-to-launch-on-product-hunt" })}>how to launch on Product Hunt</Link> and the{" "}
        <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link>. For Hacker News, read{" "}
        <Link href="/how-to-write-a-show-hn-post">how to write a Show HN post</Link>. For communities, see{" "}
        <Link href="/how-to-promote-on-reddit">how to promote your app on Reddit</Link> and{" "}
        <Link href={postPath({ slug: "how-to-launch-on-indie-hackers" })}>how to launch on Indie Hackers</Link>.
      </p>
      {ALTERNATIVES ? (
        <p>
          Comparing BetaList with other launch sites? See <Link href={postPath(ALTERNATIVES)}>Product Hunt alternatives</Link>.
        </p>
      ) : null}
      <p>
        A LaunchLoop kit drafts a tagline, a description and launch images from your repo and live page, which you can adapt for your BetaList listing. It doesn&apos;t submit
        anything for you: you still sign in to BetaList, fill in the form and choose a plan yourself. Start with a <Link href="/#start">free preview</Link> or see{" "}
        <Link href="/pricing">pricing</Link>.
      </p>

      <Faq path={postPath(p)} title="Launching on BetaList: FAQ" items={FAQ} />

      <h2 id="sources">Sources</h2>
      <p>
        Checked as of October 2026. Every quote and price on this page was read on BetaList&apos;s own pages on 21 October 2026. BetaList changes its plans and pages without
        notice, so check the links before you submit.
      </p>
      <ul>
        <li><a href={SRC.faq}>Support &amp; FAQ</a>, BetaList (also at betalist.com/faq)</li>
        <li><a href={SRC.criteria}>Submission Guidelines</a>, BetaList</li>
        <li><a href={SRC.submissionTerms}>Submission Terms</a>, BetaList</li>
        <li><a href={SRC.terms}>Terms of Service</a>, BetaList</li>
        <li><a href={SRC.boost}>Boost your startup</a>, BetaList</li>
        <li><a href={SRC.advertise}>Advertise on BetaList</a></li>
        <li><a href={SRC.landingGuide}>Designing your landing page</a>, BetaList guides</li>
        <li><a href={SRC.home}>BetaList homepage</a></li>
      </ul>
    </BlogPostLayout>
  );
}
