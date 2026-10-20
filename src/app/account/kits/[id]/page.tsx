import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { KitView } from "@/components/kit/kit-view";
import { KitSkeleton } from "@/components/kit/kit-skeleton";
import { getSession } from "@/lib/auth";
import { getKit, listUserKitIds } from "@/lib/kits";

export const metadata: Metadata = { title: "Your launch kit", robots: { index: false, follow: false } };

export default function AccountKitPage({ params, searchParams }: PageProps<"/account/kits/[id]">) {
  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] max-w-6xl px-4 py-10 sm:px-6">
      <Suspense fallback={<KitSkeleton />}>
        <AccountKit params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AccountKit({ params, searchParams }: Pick<PageProps<"/account/kits/[id]">, "params" | "searchParams">) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, getSession()]);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/account/kits/${id}`)}`);
  const [kit, ids] = await Promise.all([getKit(id), listUserKitIds(session.email)]);
  if (!kit || !ids.includes(id)) notFound();
  return (
    <div className="space-y-4">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
        ← My kits
      </Link>
      <KitView kit={kit} session={session} query={query} />
    </div>
  );
}
