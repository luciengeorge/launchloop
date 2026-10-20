import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KitView as SharedKitView } from "@/components/kit/kit-view";
import { getSession } from "@/lib/auth";
import { KitPending } from "@/components/kit/kit-pending";
import { KitSkeleton } from "@/components/kit/kit-skeleton";
import { getKit, getPendingKit } from "@/lib/kits";

export const metadata: Metadata = {
  title: "Your launch kit",
  robots: { index: false, follow: false },
};

export default function KitPage({ params, searchParams }: PageProps<"/kit/[id]">) {
  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] max-w-6xl px-4 py-10 sm:px-6">
      <Suspense fallback={<KitSkeleton />}>
        <KitView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function KitView({ params, searchParams }: Pick<PageProps<"/kit/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [kit, session] = await Promise.all([getKit(id), getSession()]);
  if (!kit) {
    const pending = await getPendingKit(id);
    if (pending) return <KitPending kitId={id} initial={pending} />;
    notFound();
  }
  return <SharedKitView kit={kit} session={session} query={query} />;
}
