import Link from "next/link";

const SRC = {
  betaListHelp: "https://betalist.com/help",
  betaListCriteria: "https://betalist.com/criteria",
  betaListSubmitting: "https://betalist.com/help/submitting",
  betaListTerms: "https://betalist.com/terms/submissions",
  flowrite: "https://www.indiehackers.com/post/is-launching-on-betalist-worth-it-in-2021-here-are-our-numbers-3e65a95d5a",
  hashtagSlayer: "https://www.indiehackers.com/post/spending-200-to-earn-9-a7994aaab4",
} as const;

const code = "rounded bg-muted px-1 py-0.5 text-sm text-foreground";

/**
 * Issue 1 as Lucien locked it on 27 Oct 2026 (newsletter-draft-2026-10-26.md), from "Hey, Lucien here." to the sign-off.
 * Word for word: tests/unit/newsletter-issues.test.ts compares every block and link with tests/unit/fixtures, so don't
 * edit the wording here. Links to launchloop.dev are site paths, so they stay on the deployment being read.
 */
export function IssueOneBody() {
  return (
    <>
      <p>Hey, Lucien here.</p>
      <p>
        This week I wrote two guides: <Link href="/blog/how-to-launch-on-betalist">how to launch on BetaList</Link> and <Link href="/blog/og-image-size">OG image size</Link>.
        A BetaList listing is a link people share, so the link has to look right too.
      </p>

      <h2 id="tip">This week&apos;s tip: get your BetaList submission right</h2>
      <p>
        All from BetaList&apos;s own <a href={SRC.betaListHelp}>Help page</a>, <a href={SRC.betaListCriteria}>criteria</a> and{" "}
        <a href={SRC.betaListSubmitting}>submission guide</a>.
      </p>
      <p>
        <strong>1. It&apos;s paid now.</strong> The Help page: &quot;All submissions are paid. There is no free submission option.&quot; Most write-ups you&apos;ll find
        are from the free queue. Paying buys speed, not a yes. The <a href={SRC.betaListTerms}>Submission Terms</a>: &quot;Priority listing guarantees faster review, not
        acceptance or any specific results.&quot;
      </p>
      <p>
        <strong>2. Use your own domain.</strong> The criteria list &quot;Free hosting subdomains like yourapp.vercel.app&quot; as a common pitfall.
      </p>
      <p>
        <strong>3. Write one plain sentence.</strong> The pitch is 75 characters. The guide says &quot;visitors decide whether to click in about a second, so clarity beats
        cleverness&quot;.
      </p>
      <p>
        <strong>4. Be ready on any day.</strong> The terms say you &quot;may be featured on any day including weekends and holidays.&quot; Flowrite was featured on a
        Saturday and <a href={SRC.flowrite}>wrote</a> &quot;it caught us with surprise&quot;.
      </p>
      <p>
        <strong>5. Keep expectations small.</strong> Hashtag Slayer <a href={SRC.hashtagSlayer}>paid $200</a> in 2020 to skip the wait. BetaList sent &quot;222 unique
        visitors&quot;, 51 trial signups and two customers.
      </p>

      <h2 id="share-card">And check your share card</h2>
      <p>When someone shares your site, the card comes from your og:image. Make it 1200x630.</p>
      <p>
        Facebook says &quot;Use images that are at least 1200 x 630 pixels&quot;. LinkedIn&apos;s minimum is &quot;1200 (w) x 627 (h) pixels&quot;. X&apos;s archived docs
        want 2:1 and &quot;less than 5MB&quot;, so 1200x630 is a fair compromise. Discord&apos;s doc only shows sizes in examples.
      </p>
      <p>
        Set <code className={code}>twitter:card</code> to <code className={code}>summary_large_image</code>, or X may show the small card. If you change the image, change
        its URL too. You can test yours with my <Link href="/tools/og-preview">OG preview</Link>.
      </p>

      <h2 id="what-shipped">What shipped</h2>
      <ul>
        <li>
          <strong>A signup box on the home page and early in each blog post.</strong> It used to live only in the footer. It&apos;s also easier to use on a phone and tells
          you when an email looks wrong.
        </li>
        <li>
          <strong>A tidier BetaList guide.</strong> Its comparison table now has a scroll hint on phones and works with the keyboard. I also corrected the Discord line in
          the OG post.
        </li>
        <li>
          <strong>Fewer dead ends on JavaScript-only sites.</strong> If your site is an empty JavaScript shell, LaunchLoop looks for the matching GitHub repo, then offers a
          one-click &quot;Use my GitHub repo instead&quot;.
        </li>
        <li>
          <strong>Your free Product Hunt tagline</strong> now leads the preview, with a copy button.
        </li>
        <li>
          <strong>Free previews:</strong> up to 10 an hour and 40 a day, no account.
        </li>
        <li>
          <strong>New kit images,</strong> built from your screenshot and logo.
        </li>
        <li>
          <strong>
            <Link href="/ship-loop">Ship Loop</Link> is a free waitlist only.
          </strong>
        </li>
      </ul>
      <p>
        Posts since last Wednesday: <Link href="/blog/product-hunt-alternatives">Product Hunt alternatives</Link>, BetaList and OG image size.
      </p>

      <h2 id="try-it">Try it</h2>
      <p>
        Paste your repo or site and get a free preview, no sign-up: <Link href="/">https://launchloop.dev</Link>
      </p>
      <p>Hit reply and tell me where you&apos;re launching next. I read everything.</p>
      <p>Lucien</p>
    </>
  );
}
