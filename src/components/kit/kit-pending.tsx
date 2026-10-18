"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";

type Pending = { state: "generating" } | { state: "failed"; error: string; fix: string };

/**
 * A free preview that's still being written: the form's stream dropped after the server accepted it.
 * Polls the status route and refreshes into the kit once it's saved.
 */
export function KitPending({ kitId, initial }: { kitId: string; initial: Pending }) {
  const router = useRouter();
  const [pending, setPending] = useState(initial);

  useEffect(() => {
    if (pending.state !== "generating") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const res = await fetch(`/api/kits/${kitId}/status`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status !== 202) return router.refresh();
        const { pending: next } = (await res.json()) as { pending: Pending };
        if (cancelled) return;
        if (next.state !== "generating") return setPending(next);
      } catch {
        // Network blips are fine; the next tick retries.
      }
      if (!cancelled) timer = setTimeout(tick, 1500);
    }
    timer = setTimeout(tick, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kitId, pending.state, router]);

  if (pending.state === "failed") {
    return (
      <div role="alert" data-testid="kit-pending" data-state="failed" className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-card px-6 py-12 text-center">
        <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
        <div className="max-w-md space-y-1">
          <p className="text-lg font-medium">{pending.error}</p>
          <p className="text-sm text-muted-foreground">{pending.fix}</p>
        </div>
        <Link href="/#start" className={buttonVariants({ size: "lg" })}>
          Make a new preview
        </Link>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" data-testid="kit-pending" data-state="generating" className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-5 py-4">
      <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      <div>
        <p className="font-medium">Still writing your preview…</p>
        <p className="text-sm text-muted-foreground">Your connection dropped, but we kept going. This page opens your kit as soon as it&apos;s ready.</p>
      </div>
    </div>
  );
}
