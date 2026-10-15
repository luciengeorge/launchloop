import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KitForm } from "@/components/kit-form";
import { StartLink } from "@/components/start-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth";
import { getShipLoop, hasBillingAccess } from "@/lib/billing";
import { IMAGE_VARIANTS, type ImageVariant } from "@/lib/image-variants";
import { listUserKits } from "@/lib/kits";
import { getProgress } from "@/lib/progress";
import { buildTasks, countableTasks } from "@/lib/tasks";
import type { Kit } from "@/lib/schema";

export const metadata: Metadata = { title: "My kits", robots: { index: false, follow: false } };

const BILLING_NOTES: Record<string, string> = {
  mock: "Billing portal is unavailable in test mode (Stripe isn't configured).",
  none: "We couldn't find a billing account for this email.",
  error: "Couldn't open the billing portal. Please try again.",
};

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const [kits, shipLoop, query] = await Promise.all([listUserKits(session.email), getShipLoop(session.email), searchParams]);
  const progress = await Promise.all(kits.map((k) => (k.paid && k.content ? kitProgress(k) : null)));
  const billingNote = typeof query.billing === "string" ? BILLING_NOTES[query.billing] : undefined;
  const showBilling = await hasBillingAccess(
    session.email,
    kits.some((k) => k.paid),
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My kits</h1>
          <p className="mt-1 text-sm text-muted-foreground" data-testid="account-email">
            {session.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {shipLoop ? (
            <Badge variant="secondary" data-testid="shiploop-badge">
              Ship Loop
            </Badge>
          ) : null}
          <StartLink className={buttonVariants({ size: "lg", className: "px-4" })}>
            <Plus aria-hidden="true" />
            New kit
          </StartLink>
        </div>
      </header>

      {showBilling ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5" data-testid="billing-card">
          <div>
            <p className="text-base font-semibold">Invoices &amp; payments</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Receipts, invoices and payment methods for your kits and Ship Loop.</p>
          </div>
          <form method="post" action="/api/billing/portal">
            <Button type="submit" size="lg" data-testid="manage-billing">
              Manage billing
            </Button>
          </form>
        </div>
      ) : null}

      {billingNote ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm" role="status">
          {billingNote}
        </p>
      ) : null}

      {kits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">No kits yet.</p>
          <Link href="/#start" className={buttonVariants({ size: "lg", className: "mt-4" })}>
            Make your first launch kit
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-4" aria-label="Your kits">
            {kits.map((kit, i) => (
              <KitRow key={kit.id} kit={kit} progress={progress[i]} />
            ))}
          </ul>
          <section id="start" className="scroll-mt-20 space-y-4 rounded-2xl border border-dashed border-border p-5 sm:p-6" aria-labelledby="new-kit-heading" data-testid="account-new-kit">
            <div>
              <h2 id="new-kit-heading" className="text-lg font-semibold">
                Generate a new kit
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Paste a GitHub repo or live site. New kits are saved to this account.</p>
            </div>
            <KitForm />
          </section>
        </>
      )}
    </div>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function kitProgress(kit: Kit) {
  const tasks = countableTasks(buildTasks({ content: kit.content!, checklist: kit.checklist ?? [], locked: false, brief: kit.brief }));
  const done = new Set(await getProgress(kit.id));
  const completed = tasks.filter((t) => done.has(t.id)).length;
  return { completed, total: tasks.length, percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0 };
}

function KitRow({ kit, progress }: { kit: Kit; progress: { completed: number; total: number; percent: number } | null }) {
  const ready = kit.paid && kit.status === "ready";
  const href = `/account/kits/${kit.id}`;
  return (
    <li className="rounded-2xl border border-border bg-card p-5 shadow-sm" data-testid="account-kit" data-kit-id={kit.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            <Link href={href} className="hover:underline">
              {kit.brief.name}
            </Link>
          </h2>
          <p className="text-sm text-muted-foreground">
            <time dateTime={kit.createdAt}>{dateFormat.format(new Date(kit.createdAt))}</time>
            {" · "}
            {kit.source.repoUrl ?? kit.source.siteUrl ?? "sample app"}
          </p>
        </div>
        <Badge variant={kit.paid ? "default" : "secondary"} data-testid="kit-status">
          {kit.paid ? (ready ? "Paid" : "Paid · generating") : "Preview"}
        </Badge>
      </div>
      {progress ? (
        <div className="mt-4" data-testid="kit-progress">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Launch pipeline</span>
            <span className="font-mono">
              {progress.completed}/{progress.total} · {progress.percent}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${kit.brief.name} checklist progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      ) : !kit.paid ? (
        <p className="mt-3 text-xs text-muted-foreground">Preview only. Unlock it to get the full kit and launch checklist.</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href={href} className={buttonVariants({ variant: kit.paid ? "outline" : "default", size: "sm" })}>
          {kit.paid ? "Open kit" : "Unlock kit"}
        </Link>
        {ready ? (
          <a href={`/api/kits/${kit.id}/zip`} className={buttonVariants({ variant: "outline", size: "sm" })} download>
            Download ZIP
          </a>
        ) : null}
        {(Object.keys(IMAGE_VARIANTS) as ImageVariant[]).map((v) =>
          ready || v === "og" ? (
            <a key={v} href={`/api/og/${kit.id}/${v}`} className={buttonVariants({ variant: "ghost", size: "sm" })} download={IMAGE_VARIANTS[v].file}>
              {IMAGE_VARIANTS[v].file}
            </a>
          ) : null,
        )}
      </div>
    </li>
  );
}
