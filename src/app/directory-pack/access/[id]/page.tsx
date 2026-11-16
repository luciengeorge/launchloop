import type { Metadata } from "next";
import { Suspense } from "react";
import { PackView } from "@/components/directory-pack/pack-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Your Directory Launch Pack",
  robots: { index: false, follow: false },
};

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
