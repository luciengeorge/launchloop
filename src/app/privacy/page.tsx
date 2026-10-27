import type { Metadata } from "next";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { SITE, resolvedPreviewLimits } from "@/lib/site";

export const metadata: Metadata = pageMetadata(PAGES.privacy);

const mail = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>;

export default function PrivacyPage() {
  const limits = resolvedPreviewLimits();
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-16 leading-relaxed sm:px-6 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_strong]:text-foreground">
      <h1 className="text-4xl font-semibold tracking-tight">Privacy policy</h1>
      <p>Last updated 27 October 2026. This page explains what LaunchLoop does with your data, in plain English.</p>

      <h2>Who we are</h2>
      <p>
        LaunchLoop is run by Lucien George, a sole trader trading as LaunchLoop. Lucien is the data controller for the data on this page. Contact: {mail}.
      </p>

      <h2>What we read</h2>
      <p>
        When you paste a link we fetch public information only: your repo&apos;s README, package.json, description, star count and last 20 commit messages from
        GitHub&apos;s public API, plus the HTML and CSS of your live page. We never clone your repo. We can&apos;t read private repos today. If that changes (Ship Loop plans a
        GitHub App for private repos), we&apos;ll update this page first and ask for your permission.
      </p>

      <h2>What we collect and keep</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Free previews.</strong> The link you pasted, the brief and preview we made, and a short excerpt of your sources (see below). If you don&apos;t buy the kit, we
          delete the preview 30 days after you made it.
        </li>
        <li>
          <strong>Your IP address,</strong> to enforce the free preview limits ({limits.perHour} an hour, {limits.perDay} a day) and the limits on our free
          tools. Kept for up to 24 hours.
        </li>
        <li>
          <strong>Your kit.</strong> The brief, the copy we made, the colours we use for your images, and a short excerpt of the sources we used (up to 4,000 characters of your
          README, plus your page&apos;s title, description, headings and a few paragraphs). Stored with Upstash. A paid kit is kept until you ask us to delete it.
        </li>
        <li>
          <strong>Your email address,</strong> if you buy a kit, sign in, or join the Ship Loop waitlist or the newsletter. We keep it until you unsubscribe or ask us to
          delete it.
        </li>
        <li>
          <strong>Sign-in.</strong> We email you a one-time sign-in link and a 6-digit code, both valid for 15 minutes, and set a cookie to keep you signed in.
        </li>
        <li>
          <strong>Payments.</strong> Stripe handles them. We get your email address, what you bought and a payment reference, and can see your name and the last 4 digits of your
          card in Stripe. We never see or store your full card number. We keep payment records for as long as UK tax law requires.
        </li>
      </ul>

      <h2>Cookies and analytics</h2>
      <p>We only set cookies that the site needs to work. We don&apos;t use advertising cookies.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>A sign-in cookie that keeps you signed in for up to 30 days, and a second one that tells the page you&apos;re signed in.</li>
        <li>A cookie that remembers the previews you made in this browser, so we can add them to your account when you sign in.</li>
        <li>
          Your browser also stores your email address (to fill in forms for you) and your checklist progress. This stays on your device. If you open one of our own test
          links (tagged qa), the tab also remembers that until you close it, so our testing isn&apos;t counted as real visits.
        </li>
      </ul>
      <p>
        We use Vercel Analytics to count page views and Vercel Speed Insights to measure how fast pages load. We use PostHog to see how many people go from a free preview to
        buying a kit. PostHog records page views and a few steps: starting a preview, the preview finishing, starting checkout and completing a purchase. Those steps include
        the kit&apos;s id, which plan and price you picked and whether you were signed in. PostHog gives you an anonymous id that only lasts while the page is open. When we
        send you on to another page ourselves (the sign-in link, Stripe checkout and back), that id goes along in the link so those steps count as one visit. We also use
        PostHog to try out small changes, such as an offer after you buy. The version you see is picked for each visit, and PostHog records which version you saw. None of
        the three set cookies, PostHog stores nothing in your browser, and we never send any of them your email address or name. Before anything is sent, we remove private kit links
        and everything in the address bar except campaign tags (utm_). Like any service your browser talks to, they receive your IP address and browser type, and PostHog may use
        your IP address to work out your rough location.
      </p>
      <p data-testid="privacy-session-replay">
        On kit pages only (the private link to each kit), PostHog also records a masked replay of how the page is used, so we can see what to make clearer. All text
        and everything you type is masked, and images and videos aren&apos;t recorded. Recordings are kept for 30 days and processed by PostHog in the EU. To opt out, turn on
        Global Privacy Control or Do Not Track in your browser, or email {mail}.
      </p>
      <p>
        We use Sentry to record errors so we can fix them. An error report includes what went wrong, the page and your browser and device type, and may include your IP address.
      </p>
      <p>
        The badges in our footer are images your browser loads from startupfa.me and twelve.tools, the directories that list LaunchLoop. Like any site your browser talks to,
        they receive your IP address and browser type.
      </p>

      <h2>Why we use it</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>To make and deliver your preview and kit, and to sign you in (our contract with you).</li>
        <li>To stop abuse of free previews, keep the service secure, fix errors and see how the site is used (our legitimate interest).</li>
        <li>To send the newsletter (only if you said yes, and you can unsubscribe any time).</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We use these services to run LaunchLoop. They only use your data to provide their service to us:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Stripe (payments)</li>
        <li>Resend (email)</li>
        <li>Vercel (hosting, Vercel Analytics, Speed Insights and Vercel AI Gateway)</li>
        <li>PostHog (product analytics: how people move from a free preview to a purchase, and masked replays of kit pages)</li>
        <li>Upstash (our database: kits, email sign-ups, sign-in links and rate limits)</li>
        <li>Sentry (error tracking)</li>
        <li>
          AI model providers, reached through Vercel AI Gateway, which turn your public sources into copy. We use Anthropic&apos;s Claude Sonnet 4.5 for most writing and
          Claude Haiku 4.5 for shorter sections. Each falls back to the other, then to OpenAI&apos;s GPT-5 mini. The gateway may run Claude through Anthropic, Amazon Web
          Services or Google Cloud, and GPT-5 mini through OpenAI or Microsoft Azure. Every request is set so it only goes to providers that don&apos;t train on your
          data. If none of them can answer, we show an error; we never pass off template text as AI-written copy.
        </li>
      </ul>
      <p>
        Some of these companies are based in the US or process data there. Where your data leaves the UK, it&apos;s covered by the transfer safeguards in each provider&apos;s
        data processing terms, such as the UK-US data bridge or the UK addendum to the EU standard contractual clauses. We don&apos;t sell your data.
      </p>

      <h2>Emails we send</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Kit buyers: your kit, receipts and sign-in links.</li>
        <li>Ship Loop waitlist: an email if and when Ship Loop launches.</li>
        <li>Newsletter: only if you signed up for it. Buying a kit or joining the waitlist doesn&apos;t sign you up. Every newsletter has an unsubscribe link.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct, export or delete your data, or object to how we use it. Email {mail} and we&apos;ll reply within one month. If you&apos;re unhappy with our
        answer, you can complain to the Information Commissioner&apos;s Office (<a href="https://ico.org.uk">ico.org.uk</a>).
      </p>

      <h2>Ship Loop</h2>
      <p>Ship Loop isn&apos;t live yet. We&apos;ll update this page before it launches to explain what it reads from your repo and how long we keep it.</p>

      <h2>Changes</h2>
      <p>If we change this page in a way that matters, we&apos;ll update the date above and email customers.</p>
    </article>
  );
}
