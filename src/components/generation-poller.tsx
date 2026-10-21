"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Polls after payment and refreshes as each section lands, so the kit fills in instead of waiting on a spinner. */
export function GenerationPoller({ kitId, failed, sectionsReady }: { kitId: string; failed: boolean; sectionsReady: number }) {
  const router = useRouter();
  const seen = useRef(sectionsReady);
  const [message, setMessage] = useState(failed ? "The first attempt hit a snag, so we're retrying." : "Finishing the last sections. They appear below as they're written.");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const res = await fetch(`/api/kits/${kitId}/status`, { cache: "no-store" });
        const data = (await res.json()) as { status: string; error: string | null; finalFailure?: boolean; sectionsReady?: number };
        if (cancelled) return;
        if (data.status === "ready" || data.finalFailure) return router.refresh();
        if ((data.sectionsReady ?? 0) > seen.current) {
          seen.current = data.sectionsReady ?? 0;
          router.refresh();
        }
        if (data.status === "failed") setMessage(data.error ?? "Retrying…");
      } catch {
        // Network blips are fine; the next tick retries.
      }
      if (!cancelled) timer = setTimeout(tick, 1000);
    }
    timer = setTimeout(tick, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kitId, router]);

  // Same min heights as the "kit is ready" card that replaces this (kit-view.tsx), so the checklist below doesn't move.
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="generation-poller"
      className="flex min-h-48 items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-5 py-4 sm:min-h-29 lg:min-h-24"
    >
      <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      <div>
        <p className="font-medium">Payment received. Your kit is unlocking…</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
