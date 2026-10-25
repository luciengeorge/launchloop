import type { Metadata } from "next";
import { KitChecklist } from "@/components/kit/kit-checklist";
import { KitOverview } from "@/components/kit/kit-overview";
import { StartLink } from "@/components/start-link";
import { buttonVariants } from "@/components/ui/button";
import { EXAMPLE_KIT } from "@/lib/example-kit";
import { buildTasks } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Example launch kit: Snapshelf",
  description: "An example LaunchLoop launch kit, written from the built-in sample app: brief, landing copy, Product Hunt post, X thread, LinkedIn post and images.",
  // An illustration, not a kit page or a landing page: keep it out of search results.
  robots: { index: false, follow: true },
};

/** The sample app's full kit, from a fixed record (EXAMPLE_KIT): nothing to unlock, buy or download as a ZIP. */
export default function ExampleKitPage() {
  const kit = EXAMPLE_KIT;
  const tasks = buildTasks({ content: kit.content!, checklist: kit.checklist!, locked: false, brief: kit.brief, example: true });
  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] max-w-6xl space-y-8 px-4 py-10 sm:px-6" data-testid="example-kit">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Example launch kit · LaunchLoop&apos;s sample app</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{kit.brief.name}</h1>
      </header>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Snapshelf is a made-up app we use as a demo. This is the full kit LaunchLoop writes from its README, package.json, commits and site. Yours is written
          from your own repo or site.
        </p>
        <StartLink className={buttonVariants({ size: "lg", className: "h-11 shrink-0 px-4" })}>Get my free preview</StartLink>
      </div>
      <KitOverview kit={kit} />
      <KitChecklist kitId={kit.id} productName={kit.brief.name} tasks={tasks} locked={false} persist="local" initialDone={[]} />
    </div>
  );
}
