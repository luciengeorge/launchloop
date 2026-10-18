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
        <p className="text-lg font-medium">We hit a problem generating your kit</p>
        <p className="text-sm text-muted-foreground">
          Your payment is safe. Our AI writer failed several times in a row, so we stopped rather than give you anything half-finished. We&apos;re on it: you&apos;ll get your kit, or a full refund. We&apos;ve emailed you, and you can try again now or reply to that email.
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
