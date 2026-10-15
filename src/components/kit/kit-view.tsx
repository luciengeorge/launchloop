import { Download, Mail } from "lucide-react";
import { GenerationPoller } from "@/components/generation-poller";
import { buttonVariants } from "@/components/ui/button";
import type { Session } from "@/lib/auth";
import { launchChecklist, mockContent } from "@/lib/copy";
import { MAX_ATTEMPTS } from "@/lib/fulfil";
import { getDraft } from "@/lib/generation";
import { PRODUCTS } from "@/lib/products";
import { getProgress, isOwner } from "@/lib/progress";
import type { Kit } from "@/lib/schema";
import { buildTasks, mask, maskContent } from "@/lib/tasks";
import { KitChecklist } from "./kit-checklist";
import { KitErrorState } from "./kit-error-state";
import { KitOverview } from "./kit-overview";
import { UnlockPanel } from "./unlock-panel";

const maskEmail = (email: string) => email.replace(/^(.)(.*)(@.*)$/, (_, a: string, b: string, c: string) => `${a}${"•".repeat(Math.min(b.length, 6))}${c}`);

interface Props {
  kit: Kit;
  session: Session | null;
  query: Record<string, string | string[] | undefined>;
}

/** Shared by /kit/[id] (private link) and /account/kits/[id]. */
export async function KitView({ kit, session, query }: Props) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Launch kit · {kit.source.repoUrl ?? kit.source.siteUrl ?? "sample app"}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{kit.brief.name}</h1>
      </header>
      <KitOverview kit={kit} />
      {kit.paid ? <PaidKit kit={kit} session={session} /> : <LockedKit kit={kit} session={session} query={query} />}
    </div>
  );
}

/**
 * The real full-kit text never reaches an unpaid page: every locked section is
 * masked placeholder text shaped like the real copy. Only the free pieces are real.
 */
async function LockedKit({ kit, session, query }: Props) {
  const draft = await getDraft(kit.id);
  const shape = draft.complete ? { ...mockContent(kit.brief, kit.preview), ...draft.sections } : mockContent(kit.brief, kit.preview);
  const tasks = buildTasks({
    content: maskContent(shape),
    checklist: launchChecklist(kit.brief).map(mask),
    locked: true,
    free: { tagline: kit.preview.tagline, xPost: kit.preview.xPost },
    brief: kit.brief,
  });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="order-2 lg:order-1" data-testid="locked-kit">
        <KitChecklist kitId={kit.id} productName={kit.brief.name} tasks={tasks} locked persist="local" initialDone={[]} />
      </div>
      <aside className="order-1 lg:sticky lg:top-20 lg:order-2 lg:self-start">
        <UnlockPanel
          kitId={kit.id}
          priceLabel={PRODUCTS.kit.priceLabel}
          email={session?.email}
          autoCheckout={query.unlock === "1"}
          cancelled={query.checkout === "cancelled"}
        />
      </aside>
    </div>
  );
}

async function PaidKit({ kit, session }: Omit<Props, "query">) {
  const owner = isOwner(kit, session);
  if (kit.status === "failed" && kit.attempts >= MAX_ATTEMPTS) return <KitErrorState kitId={kit.id} />;

  const ready = kit.status === "ready" && kit.content;
  const sections = ready ? kit.content! : (await getDraft(kit.id)).sections;
  const tasks = buildTasks({ content: sections, checklist: kit.checklist ?? launchChecklist(kit.brief), locked: false, brief: kit.brief });
  const done = owner ? await getProgress(kit.id) : [];

  return (
    <div className="space-y-6">
      {ready ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your launch kit is ready</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-4" aria-hidden="true" />
              {kit.email ? `A copy with the ZIP is going to ${maskEmail(kit.email)}.` : "Bookmark this page: it's your private link."} Work through the checklist below.
            </p>
          </div>
          <a href={`/api/kits/${kit.id}/zip`} className={buttonVariants({ size: "lg", className: "h-10 px-4" })} download>
            <Download aria-hidden="true" />
            Download ZIP
          </a>
        </div>
      ) : (
        <GenerationPoller kitId={kit.id} failed={kit.status === "failed"} sectionsReady={Object.keys(sections).length} />
      )}
      <KitChecklist kitId={kit.id} productName={kit.brief.name} tasks={tasks} locked={false} persist={owner ? "server" : "local"} initialDone={done} />
    </div>
  );
}
