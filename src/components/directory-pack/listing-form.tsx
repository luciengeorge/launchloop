"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJson, shownError } from "@/lib/client";

export interface ListingFormValues {
  name: string;
  url: string;
  oneLiner: string;
  audience: string;
  features: string;
}

/** The buyer's product, entered once: every directory's listing copy is written from it. */
export function ListingForm({ packId, initial }: { packId: string; initial?: ListingFormValues }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/directory-pack/${packId}/listings`, Object.fromEntries(new FormData(e.currentTarget)));
      router.refresh();
    } catch (err) {
      setError(shownError(err, "Couldn't write your listings just now. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const field = "space-y-1.5";
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" data-testid="listing-form">
      <div className={field}>
        <Label htmlFor="listing-name">Product name</Label>
        <Input id="listing-name" name="name" required maxLength={60} defaultValue={initial?.name} className="h-10" />
      </div>
      <div className={field}>
        <Label htmlFor="listing-url">Product URL</Label>
        <Input id="listing-url" name="url" type="url" required placeholder="https://" defaultValue={initial?.url} className="h-10" />
      </div>
      <div className={`${field} sm:col-span-2`}>
        <Label htmlFor="listing-one-liner">What it does, in one sentence</Label>
        <Input id="listing-one-liner" name="oneLiner" required minLength={10} maxLength={300} defaultValue={initial?.oneLiner} className="h-10" />
      </div>
      <div className={`${field} sm:col-span-2`}>
        <Label htmlFor="listing-audience">Who it&apos;s for</Label>
        <Input id="listing-audience" name="audience" maxLength={200} defaultValue={initial?.audience} className="h-10" />
      </div>
      <div className={`${field} sm:col-span-2`}>
        <Label htmlFor="listing-features">Key features, one per line (optional)</Label>
        <Textarea id="listing-features" name="features" rows={3} maxLength={1000} defaultValue={initial?.features} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Button type="submit" className="h-11 px-5" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {busy ? "Writing your listings…" : initial ? "Rewrite my listings" : "Write my listings"}
        </Button>
        {error ? (
          <p className="text-sm font-medium text-foreground" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
