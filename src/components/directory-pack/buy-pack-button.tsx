"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { usePageRestored } from "@/components/kit/unlock-checkout";
import { Button } from "@/components/ui/button";
import { shownError, startCheckout } from "@/lib/client";

export function BuyPackButton({ priceLabel }: { priceLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A second click before React re-renders the button as busy would start a second Checkout.
  const inFlight = useRef(false);
  usePageRestored(() => {
    inFlight.current = false;
    setBusy(false);
  });

  async function buy() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { url } = await startCheckout("directoryPack");
      window.location.assign(url);
    } catch (err) {
      inFlight.current = false;
      setBusy(false);
      setError(shownError(err, "Couldn't start checkout. Please try again."));
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" className="h-11 w-full px-5 text-base sm:w-auto" onClick={buy} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {`Buy the pack, ${priceLabel}`}
      </Button>
      {error ? (
        <p className="text-sm font-medium text-foreground" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
