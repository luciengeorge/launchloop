import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using LaunchLoop, buying a Launch Kit and pre-ordering Ship Loop.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-16 leading-relaxed sm:px-6 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-muted-foreground">
      <h1 className="text-4xl font-semibold tracking-tight">Terms</h1>
      <p>Last updated 15 October 2026.</p>
      <h2>The service</h2>
      <p>LaunchLoop drafts launch copy and images from public information about your app. Everything it produces is a draft for you to review, edit and post yourself.</p>
      <h2>Your content</h2>
      <p>You keep all rights to the kit we generate for you. Only submit repositories and sites you own or have permission to promote.</p>
      <h2>Payments and refunds</h2>
      <p>The Launch Kit is a one-off £19 payment. If it isn&apos;t useful, reply to your kit email within 14 days for a full refund. Ship Loop pre-orders are refundable in full until Ship Loop launches.</p>
      <h2>Acceptable use</h2>
      <p>Don&apos;t use LaunchLoop to generate misleading claims, spam, or content that breaks any platform&apos;s rules. We may refuse or refund orders that do.</p>
      <h2>Liability</h2>
      <p>LaunchLoop is provided as is. We&apos;re not liable for how a launch performs or for any platform&apos;s moderation decisions.</p>
    </article>
  );
}
