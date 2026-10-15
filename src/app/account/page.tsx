import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth";
import { getShipLoop } from "@/lib/billing";
import { IMAGE_VARIANTS, type ImageVariant } from "@/lib/image-variants";
import { listUserKits } from "@/lib/kits";
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
  const billingNote = typeof query.billing === "string" ? BILLING_NOTES[query.billing] : undefined;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My kits</h1>
          <p className="mt-1 text-sm text-muted-foreground" data-testid="account-email">
            {session.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {shipLoop ? (
            <form method="post" action="/api/billing/portal">
              <Button type="submit" variant="outline" size="lg">
                Manage billing
              </Button>
            </form>
          ) : null}
          <form method="post" action="/api/auth/logout">
            <Button type="submit" variant="ghost" size="lg">
              Log out
            </Button>
          </form>
        </div>
      </header>

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
        <ul className="space-y-4" aria-label="Your kits">
          {kits.map((kit) => (
            <KitRow key={kit.id} kit={kit} />
          ))}
        </ul>
      )}
    </div>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function KitRow({ kit }: { kit: Kit }) {
  const ready = kit.paid && kit.status === "ready";
  return (
    <li className="rounded-2xl border border-border bg-card p-5 shadow-sm" data-testid="account-kit" data-kit-id={kit.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            <Link href={`/kit/${kit.id}`} className="hover:underline">
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
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href={`/kit/${kit.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open kit
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
