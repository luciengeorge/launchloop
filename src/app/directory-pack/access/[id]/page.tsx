import type { Metadata } from "next";
import { Suspense } from "react";
import { PackView } from "@/components/directory-pack/pack-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getPack } from "@/lib/directory-pack";

/** The title matches what the page shows: an unpaid or unknown id gets the not-found state. */
export async function generateMetadata({ params }: PageProps<"/directory-pack/access/[id]">): Promise<Metadata> {
  const pack = await getPack((await params).id);
  return { title: pack ? "Your Directory Launch Pack" : "Pack not found", robots: { index: false, follow: false } };
}

export default function DirectoryPackAccessPage({ params }: PageProps<"/directory-pack/access/[id]">) {
  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] max-w-5xl px-4 py-10 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <PackFor params={params} />
      </Suspense>
    </div>
  );
}

async function PackFor({ params }: Pick<PageProps<"/directory-pack/access/[id]">, "params">) {
  return <PackView id={(await params).id} />;
}
