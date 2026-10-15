"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client";
import type { ProductId } from "@/lib/products";

interface Props {
  product: ProductId;
  kitId?: string;
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
}

export function CheckoutButton({ product, kitId, children, variant = "default", className }: Props) {
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
          const { url } = await postJson<{ url: string }>("/api/checkout", { product, kitId });
          window.location.assign(url);
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
