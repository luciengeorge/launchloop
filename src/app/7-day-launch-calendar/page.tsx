import type { Metadata } from "next";
import Link from "next/link";
import { GuideLayout } from "@/components/guide-layout";
import { LAUNCH_CALENDAR } from "@/lib/guides";
import { isNewsletterCalendarOn } from "@/lib/newsletter-flag-server";
import { guidePage } from "@/lib/pages";
import { calendarRewardMetadata } from "@/lib/seo";
import { OG_PREVIEW, TAGLINE_CHECKER } from "@/lib/tools";

const g = LAUNCH_CALENDAR;

export async function generateMetadata(): Promise<Metadata> {
  return calendarRewardMetadata(guidePage(g), await isNewsletterCalendarOn());
}

/** The LaunchLoop pages each task comes from. Each of them quotes and links the platform's own pages. */
const SOURCES = {
  phChecklist: { href: "/product-hunt-launch-checklist", label: "Product Hunt launch checklist" },
  phLaunch: { href: "/blog/how-to-launch-on-product-hunt", label: "How to launch on Product Hunt" },
  tagline: { href: "/how-to-write-a-product-hunt-tagline", label: "How to write a Product Hunt tagline" },
  betaList: { href: "/blog/how-to-launch-on-betalist", label: "How to launch on BetaList" },
  indieHackers: { href: "/blog/how-to-launch-on-indie-hackers", label: "How to launch on Indie Hackers" },
  reddit: { href: "/how-to-promote-on-reddit", label: "How to promote on Reddit" },
  ogImage: { href: "/blog/og-image-size", label: "OG image size" },
  alternatives: { href: "/blog/product-hunt-alternatives", label: "Product Hunt alternatives" },
  showHn: { href: "/show-hn-launch-checklist", label: "Show HN launch checklist" },
} as const;

type Source = keyof typeof SOURCES;

/** One checkable task. The box is named by the task's bold title, not the whole sentence and its sources. */
function Task({ id, title, from = [], children }: { id: string; title: React.ReactNode; from?: Source[]; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <input type="checkbox" id={id} aria-labelledby={`${id}-title`} className="mt-1.5 size-4 shrink-0 accent-primary" />
      <span>
        <strong id={`${id}-title`} className="text-foreground">
          {title}
        </strong>
        {children ? <> {children}</> : null}
        {from.length ? (
          <>
            {" "}
            <span className="text-sm">
              (
              {from.map((key, i) => (
                <span key={key}>
                  {i ? "; " : null}
                  <Link href={SOURCES[key].href}>{SOURCES[key].label}</Link>
                </span>
              ))}
              )
            </span>
          </>
        ) : null}
      </span>
    </li>
  );
}

function Tasks({ children }: { children: React.ReactNode }) {
  return <ul className="list-none! space-y-3! pl-0!">{children}</ul>;
}

const code = "rounded bg-muted px-1 py-0.5 text-sm text-foreground";

export default function LaunchCalendarPage() {
  return (
    <GuideLayout guide={g}>
      <p>
        A day-by-day plan for the week before a launch. It covers Product Hunt, your share card, BetaList, Indie Hackers and a couple of free directories. Each task points
        back to a LaunchLoop guide or to the platform&apos;s own rules.
      </p>
      <p>
        Print it, copy it into a note, or check the boxes as you go. Nothing here is a guarantee of traffic. It is a prep order so launch day is replies, not panic.
      </p>
      <p>
        <strong className="text-foreground">How to use it:</strong> pick a Product Hunt launch day (it goes live at 12:01 AM Pacific). Count back six days. Work one section a
        day. Skip any channel that does not fit your product.
      </p>

      <h2 id="day-1">Day 1: foundations (6 days out)</h2>
      <Tasks>
        <Task id="day-1-ph-day" title="Pick the Product Hunt day." from={["phChecklist", "phLaunch"]}>
          Launches go live at 12:01 AM Pacific on the date you schedule. Product Hunt&apos;s help center says you can schedule any day within 30 days. Weekdays have more
          traffic and more competition; weekends are quieter on both counts.
        </Task>
        <Task id="day-1-stranger" title="Make sure a stranger can use the product." from={["phChecklist"]}>
          Sign up in a private window, on a phone, with a fresh email. Fix anything that blocks the first minute.
        </Task>
        <Task id="day-1-domain" title="Put the product on your own domain." from={["betaList"]}>
          BetaList&apos;s criteria list free hosting subdomains such as yourapp.vercel.app as a common pitfall. Its Help page: &quot;Your startup must have its own
          domain.&quot; Do this before any BetaList submit.
        </Task>
        <Task id="day-1-show-hn" title="Decide whether Show HN fits." from={["showHn"]}>
          Show HN wants something people can try now, not a landing page or waitlist. If it does not fit, skip it.
        </Task>
      </Tasks>

      <h2 id="day-2">Day 2: the share card</h2>
      <p>When someone pastes your URL, the card comes from your og:image. Fix this before you submit anywhere.</p>
      <Tasks>
        <Task id="day-2-size" title="Make one image at 1200x630." from={["ogImage"]}>
          Facebook asks for at least 1200 x 630. LinkedIn&apos;s minimum is 1200 x 627. X&apos;s archived docs want about 2:1 and under 5MB. 1200x630 is the compromise that
          fits all three.
        </Task>
        <Task
          id="day-2-twitter-card"
          title={
            <>
              Set <code className={code}>twitter:card</code> to <code className={code}>summary_large_image</code>.
            </>
          }
          from={["ogImage"]}
        >
          Without it, X may show the small summary card.
        </Task>
        <Task id="day-2-new-url" title="If you change the image, change its URL too." from={["ogImage"]}>
          Facebook: use a new URL or the image will not update.
        </Task>
        <Task id="day-2-test" title="Test the live URL" from={["ogImage"]}>
          with the free <Link href={OG_PREVIEW.path}>OG preview</Link>.
        </Task>
      </Tasks>

      <h2 id="day-3">Day 3: Product Hunt listing draft</h2>
      <p>Write the listing now so launch day is replies, not drafting.</p>
      <Tasks>
        <Task id="day-3-name" title="Name:">
          product name only.
        </Task>
        <Task id="day-3-tagline" title="Tagline: 60 characters max." from={["phChecklist", "tagline"]}>
          Say what it does and for whom. Test it with the <Link href={TAGLINE_CHECKER.path}>tagline checker</Link>.
        </Task>
        <Task id="day-3-description" title="Description: 260 characters max." from={["phChecklist"]}>
          Problem, what you do about it, one concrete detail only you can claim.
        </Task>
        <Task id="day-3-topics" title="Topics:">
          up to three that match where your users browse.
        </Task>
        <Task id="day-3-images" title="Thumbnail 240x240. Gallery images 1270x760." from={["phChecklist"]}>
          Lead with the result, not the login screen. Three to five images.
        </Task>
        <Task id="day-3-maker-comment" title="Draft the maker comment." from={["phChecklist"]}>
          Why you built it, what it does today, what is next, and one specific question you want answered. You post this as soon as you go live.
        </Task>
        <Task id="day-3-no-upvotes" title="Do not plan to ask for upvotes." from={["phChecklist", "phLaunch"]}>
          Product Hunt&apos;s Launch Guide: never ask outright for upvotes or run anything that requires them. Share the link and ask for feedback instead.
        </Task>
      </Tasks>

      <h2 id="day-4">Day 4: BetaList and one free directory</h2>
      <Tasks>
        <Task id="day-4-fit" title="Confirm BetaList still fits." from={["betaList", "alternatives"]}>
          It wants unreleased or recently launched technology startups. It turns away free hosting subdomains, blogs, courses, consultancies and products that have already
          had significant press.
        </Task>
        <Task id="day-4-paid" title="Know it is paid." from={["betaList"]}>
          BetaList&apos;s Help page: &quot;All submissions are paid. There is no free submission option.&quot; Paying buys a faster review, not a yes. The Submission Terms:
          &quot;Priority listing guarantees faster review, not acceptance or any specific results.&quot; If it is not selected, Help says you get a full refund
          automatically.
        </Task>
        <Task id="day-4-fields" title="Write the fields within the limits." from={["betaList"]}>
          Website URL 255, Name 255, Pitch 75 characters (one plain sentence), Description 700 characters plain text. The submission guide: visitors decide whether to click in
          about a second, so clarity beats cleverness.
        </Task>
        <Task id="day-4-any-day" title="Be ready on any day." from={["betaList"]}>
          The terms say you may be featured on any day including weekends and holidays. Do not promise your audience a date.
        </Task>
        <Task id="day-4-directory" title="Pick one free directory that fits, and read its rules." from={["alternatives"]}>
          From the Product Hunt alternatives post (checked on those sites&apos; own pages in October 2026): Uneed has a free waiting line; DevHunt has a free listing for
          developer tools (a launch is paid); Peerlist Launchpad with a verified profile; Fazier&apos;s Basic tier (asks for a link back); Tiny Startups. Hacker News, Indie
          Hackers and Reddit list no fee for posting. Skip any site that does not match your product.
        </Task>
      </Tasks>

      <h2 id="day-5">Day 5: Indie Hackers (and other communities)</h2>
      <Tasks>
        <Task id="day-5-product-page" title="Create a product page and post a milestone." from={["indieHackers"]}>
          Courtland Allen (2019): create a product page and post new milestones on a regular basis.
        </Task>
        <Task id="day-5-forum-post" title="Write a forum post that teaches or asks, with the link at the end." from={["indieHackers"]}>
          Allen&apos;s tips: share lessons and questions rather than announcements; leave your company name out of the title unless it is very well known; put the important
          part first.
        </Task>
        <Task id="day-5-no-spam" title="Do not treat launch day as a spam pass." from={["phLaunch"]}>
          Product Hunt warns: launch day is not a time to go spamming Reddit and Indie Hackers if you have not already been part of those communities. Warm up now, or skip.
        </Task>
        <Task id="day-5-reddit" title="If you also post on Reddit," from={["indieHackers", "reddit"]}>
          follow that subreddit&apos;s own rules. r/indiehackers is not the same site as Indie Hackers.
        </Task>
      </Tasks>

      <h2 id="day-6">Day 6: prep day (1 day out)</h2>
      <Tasks>
        <Task id="day-6-schedule" title="Schedule the Product Hunt launch" from={["phLaunch"]}>
          for 12:01 AM Pacific tomorrow (or your chosen day).
        </Task>
        <Task id="day-6-posts" title="Finish the X thread and LinkedIn post" from={["phChecklist", "ogImage"]}>
          with the Product Hunt link, written ahead of time. Use a 1600x900 image for those posts if you have one; the site share card stays 1200x630.
        </Task>
        <Task id="day-6-tell-people" title="Tell people the date without asking for votes." from={["phChecklist"]}>
          Newsletter, early users, communities you already take part in. Ask them to check it out and send feedback.
        </Task>
        <Task id="day-6-betalist" title="If BetaList is in flight," from={["betaList"]}>
          keep tomorrow free enough to handle a feature on a weekend or holiday.
        </Task>
        <Task id="day-6-show-hn" title="Optional Show HN:" from={["showHn"]}>
          only if the product is ready to try. Title format and rules are in the Show HN checklist. Do not ask for upvotes or comments.
        </Task>
      </Tasks>

      <h2 id="day-7">Day 7: launch day</h2>
      <Tasks>
        <Task id="day-7-live" title="Confirm the Product Hunt listing is live" from={["phChecklist"]}>
          just after 12:01 AM Pacific and post your maker comment.
        </Task>
        <Task id="day-7-posts" title="Post the X thread and LinkedIn post" from={["phChecklist"]}>
          with the Product Hunt link.
        </Task>
        <Task id="day-7-share" title="Share the direct link." from={["phChecklist"]}>
          Product Hunt says there is no penalty for linking directly to your product. Ask for feedback, never for upvotes.
        </Task>
        <Task id="day-7-reply" title="Reply to comments for the rest of the day." from={["phLaunch"]}>
          Product Hunt&apos;s Launch Guide: show up and be present; reply quickly and honestly.
        </Task>
        <Task id="day-7-points" title="If points drop," from={["phLaunch"]}>
          in most cases Product Hunt&apos;s filters removed votes it judged non-genuine. Keep replying; do not chase votes.
        </Task>
        <Task id="day-7-ih" title="Indie Hackers forum post" from={["indieHackers"]}>
          can go out today or in the next day or two, as a lessons post, not a &quot;we launched, upvote us&quot; post.
        </Task>
      </Tasks>

      <h2 id="after">After the week</h2>
      <ul>
        <li>Keep the Product Hunt product page updated.</li>
        <li>
          If you want a second BetaList feature, the criteria allow one pre-launch and one at launch with at least a few weeks between them. (
          <Link href={SOURCES.betaList.href}>{SOURCES.betaList.label}</Link>)
        </li>
        <li>
          For a Product Hunt relaunch later, Product Hunt asks for a significant update and at least two months between posts for the same product. (
          <Link href={SOURCES.phLaunch.href}>{SOURCES.phLaunch.label}</Link>)
        </li>
      </ul>

      <h2 id="limits">The limits</h2>
      <p>
        This calendar is free prep, not a promise of visitors or signups. Platform rules change; when in doubt, read the live help page linked from each LaunchLoop guide.
        Every quote above was taken from those guides, which cite the platforms&apos; own pages as of October 2026.
      </p>
    </GuideLayout>
  );
}
