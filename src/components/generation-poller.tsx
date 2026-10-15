"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Polls kit status after payment and refreshes the page once the full kit is ready. */
export function GenerationPoller({ kitId, failed }: { kitId: string; failed: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState(failed ? "The first attempt failed, so we're retrying." : "Writing your full kit. This usually takes under a minute.");

  useEffect(() => {
    let cancelled = false;
    let delay = 1500;
    async function tick() {
      try {
        const res = await fetch(`/api/kits/${kitId}/status`, { cache: "no-store" });
        const data = (await res.json()) as { status: string; error: string | null };
        if (cancelled) return;
        if (data.status === "ready") {
          router.refresh();
          return;
        }
        if (data.status === "failed") setMessage(data.error ?? "Generation failed. Retrying…");
      } catch {
        // Network blips are fine; the next tick retries.
      }
      delay = Math.min(delay * 1.4, 6000);
      if (!cancelled) setTimeout(tick, delay);
    }
    const first = setTimeout(tick, 800);
    return () => {
      cancelled = true;
      clearTimeout(first);
    };
  }, [kitId, router]);

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <div className="space-y-1">
        <p className="text-lg font-medium">Payment received. Building your launch kit…</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
