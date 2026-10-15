"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/lib/client";
import type { Experiments } from "@/lib/experiments";
import type { ProductId } from "@/lib/products";

interface Props {
  product: ProductId;
  kitId?: string;
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
  /** Variants shown alongside this button, recorded on the checkout events. */
  experiments?: Experiments;
}

export function CheckoutButton({ product, kitId, children, variant = "default", className, experiments }: Props) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          window.location.assign((await startCheckout(product, kitId, experiments)).url);
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
