"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startPreorderCheckout } from "@/lib/client";
import type { Experiments } from "@/lib/experiments";

/** Starts the £99 Ship Loop founding pre-order checkout. If the server can't sell it, the toast points to the waitlist. */
export function PreorderButton({ children, className, experiments }: { children: React.ReactNode; className?: string; experiments?: Experiments }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      className={className}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          window.location.assign((await startPreorderCheckout(experiments)).url);
        } catch (err) {
          toast.error((err as Error).message);
          setLoading(false);
        }
      }}
    >
      {loading ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
