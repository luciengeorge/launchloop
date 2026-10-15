import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FullKit } from "@/components/kit/full-kit";
import { KitOverview } from "@/components/kit/kit-overview";
import { KitPreview } from "@/components/kit/kit-preview";
import { GenerationPoller } from "@/components/generation-poller";
import { Skeleton } from "@/components/ui/skeleton";
import { getKit } from "@/lib/kits";

export const metadata: Metadata = {
  title: "Your launch kit",
  robots: { index: false, follow: false },
};

export default function KitPage({ params, searchParams }: PageProps<"/kit/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Suspense fallback={<KitSkeleton />}>
        <KitView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function KitView({ params, searchParams }: Pick<PageProps<"/kit/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const kit = await getKit(id);
  if (!kit) notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Launch kit · {kit.source.repoUrl ?? kit.source.siteUrl ?? "sample app"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{kit.brief.name}</h1>
      </header>

      <KitOverview kit={kit} />

      {!kit.paid ? (
        <KitPreview kit={kit} cancelled={query.checkout === "cancelled"} />
      ) : kit.status === "ready" && kit.content ? (
        <FullKit kit={{ ...kit, content: kit.content }} />
      ) : (
        <GenerationPoller kitId={kit.id} failed={kit.status === "failed"} />
      )}
    </div>
  );
}

function KitSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your kit">
      <div className="space-y-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-10 w-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
