"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client";
import { useQueryParam } from "@/lib/use-query-param";

export function WaitlistForm({ plan }: { plan: "monthly" | "yearly" }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const redirected = useQueryParam("joined");
  const done = state === "done" || redirected === "1";
  const shownError = error ?? (redirected === "0" && state === "idle" ? "Enter a valid email address." : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setError(null);
    try {
      await postJson("/api/waitlist", { email: new FormData(e.currentTarget).get("email"), plan });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  if (done) {
    return (
      <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm font-medium" role="status">
        You&apos;re on the waitlist. We&apos;ll email you the day Ship Loop opens.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} method="post" action="/api/waitlist" className="space-y-2" aria-label="Join the Ship Loop waitlist">
      <input type="hidden" name="plan" value={plan} />
      <label htmlFor="waitlist-email" className="sr-only">
        Email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="waitlist-email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" className="h-10" />
        <Button type="submit" variant="outline" className="h-10 px-4" disabled={state === "loading"}>
          {state === "loading" ? "Joining…" : "Join the waitlist (free)"}
        </Button>
      </div>
      {shownError ? <p className="text-sm text-destructive" role="alert">{shownError}</p> : null}
    </form>
  );
}
