import { HideFooterWhileLoading } from "@/components/hide-footer-while-loading";
import { Skeleton } from "@/components/ui/skeleton";

export function KitSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your kit">
      <HideFooterWhileLoading />
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
