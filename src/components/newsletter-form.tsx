"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client";
import { useQueryParam } from "@/lib/use-query-param";

export function NewsletterForm() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const redirected = useQueryParam("subscribed");
  const done = state === "done" || redirected === "1";
  const shownError = error ?? (redirected === "0" && state === "idle" ? "Enter a valid email address." : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setState("loading");
    setError(null);
    try {
      await postJson("/api/newsletter", { email });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  if (done) {
    return <p className="text-sm font-medium" role="status">You&apos;re subscribed. One useful launch teardown a week, no spam.</p>;
  }

  return (
    <form onSubmit={onSubmit} method="post" action="/api/newsletter" className="space-y-2" aria-label="Newsletter signup">
      <label htmlFor="newsletter-email" className="text-sm font-medium">
        Weekly launch teardowns
      </label>
      <div className="flex max-w-sm gap-2">
        <Input id="newsletter-email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" className="h-9 bg-background" />
        <Button type="submit" size="lg" disabled={state === "loading"}>
          {state === "loading" ? "Joining…" : "Subscribe"}
        </Button>
      </div>
      {shownError ? <p className="text-sm text-destructive" role="alert">{shownError}</p> : null}
    </form>
  );
}
