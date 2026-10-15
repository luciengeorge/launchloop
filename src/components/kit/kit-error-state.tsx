"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Shown when generation failed after every automatic retry. The payment is safe; the buyer can retry or get help. */
export function KitErrorState({ kitId }: { kitId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <div role="alert" data-testid="kit-error-state" className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-card px-6 py-12 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <div className="max-w-md space-y-1">
        <p className="text-lg font-medium">We couldn&apos;t finish writing your kit</p>
        <p className="text-sm text-muted-foreground">
          Your payment is safe and nothing is lost. Our AI writer failed a few times in a row, which usually clears up within minutes. Try again, or email hello@launchloop.dev and we&apos;ll sort it or refund you.
        </p>
      </div>
      <Button
        size="lg"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await fetch(`/api/kits/${kitId}/retry`, { method: "POST" }).catch(() => null);
          router.refresh();
        }}
      >
        {loading ? <Loader2 className="animate-spin" /> : null}
        Try again
      </Button>
    </div>
  );
}
