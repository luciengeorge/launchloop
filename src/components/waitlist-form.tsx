"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE } from "@/lib/site";
import { useQueryParam } from "@/lib/use-query-param";
import { WAITLIST_ERROR_MESSAGES, type WaitlistErrorReason, type WaitlistSource } from "@/lib/waitlist";
import { joinWaitlist, waitlistViewTracker } from "@/lib/waitlist-client";

type State = "idle" | "loading" | "joined" | "duplicate";

interface Failure {
  reason: WaitlistErrorReason;
  message: string;
}

const FALLBACK_MAILTO = `mailto:${SITE.email}?subject=${encodeURIComponent("Ship Loop waitlist")}`;

/**
 * Ship Loop waitlist email capture, tagged shiploop_waitlist by /api/waitlist. Free: no price and no checkout.
 * Records waitlist_cta_viewed once it's on screen, then waitlist_signup or waitlist_error from the server's answer.
 * `kitId` ties the events to the kit whose page shows it.
 */
export function WaitlistForm({ source, kitId, className = "" }: { source: WaitlistSource; kitId?: string; className?: string }) {
  const [state, setState] = useState<State>("idle");
  const [failure, setFailure] = useState<Failure | null>(null);
  const inputId = useId();
  const errorId = useId();
  const root = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const [viewed] = useState(() => waitlistViewTracker({ source, kitId }));
  useEffect(() => viewed.observe(root.current), [viewed]);

  // Set by the no-JS form post's redirect.
  const redirected = useQueryParam("joined");
  const shown: State = state !== "idle" ? state : redirected === "1" ? "joined" : redirected === "dup" ? "duplicate" : "idle";
  const shownFailure: Failure | null =
    failure ?? (redirected === "0" && state === "idle" ? { reason: "invalid_email", message: WAITLIST_ERROR_MESSAGES.invalid_email } : null);
  const fixEmail = shownFailure?.reason === "invalid_email";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setFailure(null);
    const result = await joinWaitlist(String(new FormData(e.currentTarget).get("email") ?? ""), { source, kitId });
    if (result.ok) {
      setState(result.duplicate ? "duplicate" : "joined");
      return;
    }
    setFailure({ reason: result.reason, message: result.message });
    setState("idle");
  }

  function retry() {
    if (fixEmail) {
      input.current?.focus();
      input.current?.select();
      return;
    }
    form.current?.requestSubmit();
  }

  return (
    <div ref={root} className={className}>
      {shown === "joined" || shown === "duplicate" ? (
        <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm font-medium" role="status" data-testid="waitlist-status" data-state={shown}>
          {shown === "joined" ? "You're on the waitlist." : "You're already on the waitlist."} We&apos;ll email you when Ship Loop launches.
        </p>
      ) : (
        <form ref={form} onSubmit={onSubmit} method="post" action="/api/waitlist" className="space-y-2" aria-label="Join the Ship Loop waitlist" data-testid="waitlist-form">
          <input type="hidden" name="source" value={source} />
          <label htmlFor={inputId} className="sr-only">
            Email
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={input}
              id={inputId}
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={fixEmail || undefined}
              aria-describedby={shownFailure ? errorId : undefined}
              className="h-11 bg-background"
            />
            <Button type="submit" className="h-11 px-4" disabled={shown === "loading"}>
              {shown === "loading" ? "Joining…" : "Join the waitlist"}
            </Button>
          </div>
          {shownFailure ? (
            // Foreground text in a red-bordered box: red text on the upsell's tinted card is under 4.5:1.
            <div className="space-y-1 rounded-lg border border-destructive/60 bg-background p-3" data-testid="waitlist-error" data-reason={shownFailure.reason}>
              <p id={errorId} className="text-sm font-medium text-foreground" role="alert">
                {shownFailure.message}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Button type="button" variant="outline" className="h-11 px-4" onClick={retry}>
                  {fixEmail ? "Edit your email" : "Try again"}
                </Button>
                <a href={FALLBACK_MAILTO} className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline underline-offset-4 hover:decoration-2">
                  Or email {SITE.email}
                </a>
              </div>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
