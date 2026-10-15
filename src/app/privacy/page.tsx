import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description: "What LaunchLoop collects, why, and how long we keep it.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-16 leading-relaxed sm:px-6 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
      <h1 className="text-4xl font-semibold tracking-tight">Privacy</h1>
      <p>Last updated 15 October 2026. This is a plain-English summary of how LaunchLoop handles data.</p>
      <h2>What we read</h2>
      <p>
        When you paste a URL we fetch public information only: your repository&apos;s README, package.json, description, stars and the last 20 commit messages from GitHub&apos;s public
        API, and the HTML and CSS of your live page. We never clone your repository and cannot read private repos.
      </p>
      <h2>What we store</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your kit: the brief, generated copy and a short excerpt of the sources it was built from.</li>
        <li>Your email address, if you buy a kit, join the waitlist or subscribe to the newsletter.</li>
        <li>Payment details are handled by Stripe. We never see or store your card number.</li>
      </ul>
      <h2>Who we share it with</h2>
      <p>Stripe (payments), Resend (email), Vercel (hosting) and, through Vercel AI Gateway, the AI model providers that generate copy from your public sources. We don&apos;t sell data.</p>
      <h2>Your choices</h2>
      <p>Newsletter emails include an unsubscribe link. To delete your kit or contact record, email hello@launchloop.dev.</p>
    </article>
  );
}
