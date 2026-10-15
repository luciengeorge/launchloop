import { GitCommitHorizontal, Image as ImageIcon, MailCheck, PenLine } from "lucide-react";
import type { Metadata } from "next";
import { ShipLoopPlans } from "@/components/ship-loop-plans";

export const metadata: Metadata = {
  title: "Ship Loop: launch posts for every release",
  description: "Ship Loop watches your repo and drafts new X, LinkedIn and Product Hunt-ready posts plus an on-brand image every time you release. £12/month or £99/year. Join the waitlist or pre-order.",
  alternates: { canonical: "/ship-loop" },
};

const FLOW = [
  { icon: GitCommitHorizontal, title: "You ship", body: "Push a release or tag on your default branch, or update your changelog." },
  { icon: PenLine, title: "We draft", body: "Ship Loop reads the diff and release notes and writes an X post, a LinkedIn update and a changelog blurb." },
  { icon: ImageIcon, title: "With an image", body: "Every update gets a fresh social image in your brand colours, sized for each platform." },
  { icon: MailCheck, title: "You approve", body: "One email with a one-click approve or edit link. Nothing posts without you." },
];

export default function ShipLoopPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:items-start">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Coming soon · Waitlist open</p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Launch once. Keep shipping in public on autopilot.</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Ship Loop turns every release into ready-to-post updates and an on-brand image, so your audience sees you shipping without you writing a word.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {FLOW.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-2xl border border-border bg-card p-5">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h2 className="mt-3 font-medium">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Bought a £19 Launch Kit? Subscribe within 14 days and we credit the full £19.</li>
            <li>• Drafts only. We never auto-post or ask anyone for upvotes.</li>
            <li>• Public GitHub repos at launch; private repos via a GitHub App soon after.</li>
          </ul>
        </div>
        <ShipLoopPlans />
      </div>
    </div>
  );
}
