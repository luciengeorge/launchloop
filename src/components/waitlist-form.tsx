"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client";
import { waitlistRequestError } from "@/lib/form-errors";
import { useQueryParam } from "@/lib/use-query-param";
import type { WaitlistResponse, WaitlistSource } from "@/lib/waitlist";

type State = "idle" | "loading" | "joined" | "duplicate";

/** Ship Loop waitlist email capture, tagged shiploop_waitlist by /api/waitlist. `plan`, when set, is recorded with the signup. */
export function WaitlistForm({ source, plan, className = "" }: { source: WaitlistSource; plan?: "monthly" | "yearly"; className?: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  // Set by the no-JS form post's redirect.
  const redirected = useQueryParam("joined");
  const shown: State = state !== "idle" ? state : redirected === "1" ? "joined" : redirected === "dup" ? "duplicate" : "idle";
  const shownError = error ?? (redirected === "0" && state === "idle" ? "Enter a valid email address." : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setError(null);
    try {
      const { duplicate } = await postJson<WaitlistResponse>("/api/waitlist", { email: new FormData(e.currentTarget).get("email"), ...(plan ? { plan } : {}), source });
      setState(duplicate ? "duplicate" : "joined");
    } catch (err) {
      setError(waitlistRequestError(err));
      setState("idle");
    }
  }

  if (shown === "joined" || shown === "duplicate") {
    return (
      <p className={`rounded-lg bg-primary/10 px-4 py-3 text-sm font-medium ${className}`} role="status" data-testid="waitlist-status" data-state={shown}>
        {shown === "joined" ? "You're on the waitlist." : "You're already on the waitlist."} We&apos;ll email you when Ship Loop launches.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} method="post" action="/api/waitlist" className={`space-y-2 ${className}`} aria-label="Join the Ship Loop waitlist" data-testid="waitlist-form">
      {plan ? <input type="hidden" name="plan" value={plan} /> : null}
      <input type="hidden" name="source" value={source} />
      <label htmlFor={inputId} className="sr-only">
        Email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id={inputId} name="email" type="email" required placeholder="you@example.com" autoComplete="email" className="h-10 bg-background" />
        <Button type="submit" className="h-10 px-4" disabled={shown === "loading"}>
          {shown === "loading" ? "Joining…" : "Join the waitlist"}
        </Button>
      </div>
      {shownError ? (
        <p className="text-sm text-destructive" role="alert">
          {shownError}
        </p>
      ) : null}
    </form>
  );
}
