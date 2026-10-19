"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isTestVisit } from "@/lib/analytics";
import { postJson } from "@/lib/client";
import type { ProductId } from "@/lib/products";

interface Props {
  product: ProductId;
  kitId?: string;
  priceLabel: string;
  defaultEmail?: string;
  /** PostHog id from the page that started checkout, like Stripe metadata in the real flow. */
  analyticsId?: string;
  /** Promotion code the real session would carry. */
  promo?: string;
}

export function MockCheckoutForm({ product, kitId, priceLabel, defaultEmail, analyticsId, promo }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const email = String(new FormData(e.currentTarget).get("email") ?? "");
      const { url } = await postJson<{ url: string }>("/api/checkout/mock", { product, kitId, email, analyticsId, promo, ...(isTestVisit() ? { isTest: true } : {}) });
      window.location.assign(url);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="checkout-email">Email for your receipt and kit</Label>
        <Input id="checkout-email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} placeholder="you@example.com" className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="card">Card</Label>
        <Input id="card" value="4242 4242 4242 4242 · 12/34 · 123" readOnly disabled className="h-10 font-mono" />
      </div>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : null}
        Pay {priceLabel} (test mode)
      </Button>
    </form>
  );
}
