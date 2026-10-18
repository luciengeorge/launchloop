"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { postJson } from "@/lib/client";
import {
  LEAD_MAGNET,
  NEWSLETTER_ERRORS,
  type NewsletterErrorCode,
  type NewsletterPlacement,
  newsletterError,
  newsletterErrorAnchor,
  parsePlacement,
} from "@/lib/newsletter";
import { useHydrated, useQueryParam } from "@/lib/use-query-param";

interface Props {
  placement?: NewsletterPlacement;
  label?: string;
  /** Keeps the label for screen readers only, when a heading next to the form already says what it is. */
  hideLabel?: boolean;
  /** Line under the field. `null` drops it. */
  hint?: string | null;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline";
  /** Same-origin path a no-JS post returns to. Without it the API sends the visitor to the home page. */
  returnTo?: string;
  /** The no-JS post's `?subscribed=` and `?error=` when the server page already knows them, so they render without JavaScript. */
  redirected?: { subscribed?: string; error?: string };
}

export function NewsletterForm({
  placement = "footer",
  label = "Weekly launch teardowns",
  hideLabel = false,
  hint = "I'll send you my launch-day checklist straight away, then one launch teardown a week.",
  buttonLabel = "Subscribe",
  buttonVariant = "default",
  returnTo,
  redirected: redirectedProp,
}: Props) {
  const id = useId();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  // A no-JS post comes back with ?subscribed= (and ?from= for anything but the footer); only that form reacts.
  const subscribedParam = useQueryParam("subscribed");
  const errorParam = useQueryParam("error");
  const hydrated = useHydrated();
  const fromHere = parsePlacement(useQueryParam("from")) === placement;
  const redirected = redirectedProp ?? (fromHere ? { subscribed: subscribedParam ?? undefined, error: errorParam ?? undefined } : {});
  const done = state === "done" || redirected.subscribed === "1";
  const redirectError = redirected.subscribed === "0" ? (newsletterError(redirected.error) ?? NEWSLETTER_ERRORS.invalid) : null;
  const shownError = error ?? (state === "idle" ? redirectError : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setState("loading");
    setError(null);
    try {
      await postJson("/api/newsletter", { email, placement });
      track("newsletter_subscribed", { placement });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  if (done) {
    return (
      <div className="space-y-1 text-sm" role="status" data-testid={`newsletter-done-${placement}`}>
        <p className="font-medium">You&apos;re subscribed. One useful launch teardown a week, no spam.</p>
        <p className="text-muted-foreground">
          <Link href={LEAD_MAGNET.path} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
            Open your {LEAD_MAGNET.title}
          </Link>
          . I&apos;ve emailed you the link too.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} method="post" action="/api/newsletter" className="space-y-2" aria-label="Newsletter signup" data-placement={placement}>
      <input type="hidden" name="placement" value={placement} />
      {returnTo ? <input type="hidden" name="next" value={returnTo} /> : null}
      <label htmlFor={`${id}-email`} className={hideLabel ? "sr-only" : "text-sm font-medium"}>
        {label}
      </label>
      <div className="flex max-w-sm gap-2">
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="h-9 bg-background"
        />
        <Button type="submit" size="lg" variant={buttonVariant} disabled={state === "loading"}>
          {state === "loading" ? "Joining…" : buttonLabel}
        </Button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {shownError ? <p className="text-sm text-destructive" role="alert">{shownError}</p> : null}
      {/* A static page can't read ?error= on the server, so until JS runs the post's redirect reveals one of these by its #hash. */}
      {hydrated || redirectError
        ? null
        : (Object.keys(NEWSLETTER_ERRORS) as NewsletterErrorCode[]).map((code) => (
            <p key={code} id={newsletterErrorAnchor(placement, code)} className="hidden text-sm text-destructive target:block">
              {NEWSLETTER_ERRORS[code]}
            </p>
          ))}
    </form>
  );
}
