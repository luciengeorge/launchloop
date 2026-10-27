"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isTestVisit, pageAnalyticsId } from "@/lib/analytics";
import { postJson } from "@/lib/client";
import { EMAIL_MAX, EMAIL_PATTERN, isEmail } from "@/lib/email-address";
import { newsletterRequestError } from "@/lib/form-errors";
import {
  LEAD_MAGNET,
  NEWSLETTER_ERRORS,
  type NewsletterErrorCode,
  type NewsletterPlacement,
  type WelcomeOutcome,
  newsletterError,
  newsletterErrorAnchor,
  parsePlacement,
  parseWelcome,
} from "@/lib/newsletter";
import { useFormViewed } from "@/lib/use-form-viewed";
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
  /** The no-JS post's `?subscribed=`, `?welcome=` and `?error=` when the server page already knows them, so they render without JavaScript. */
  redirected?: { subscribed?: string; welcome?: string; error?: string };
  /** Id of the visible heading that names this form, so it isn't one of two "Newsletter signup" forms on the page. */
  labelledBy?: string;
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
  labelledBy,
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const live = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [welcome, setWelcome] = useState<WelcomeOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState(false);
  useFormViewed(root, placement);

  // A no-JS post comes back with ?subscribed= (and ?from= for anything but the footer); only that form reacts.
  const subscribedParam = useQueryParam("subscribed");
  const welcomeParam = useQueryParam("welcome");
  const errorParam = useQueryParam("error");
  const hydrated = useHydrated();
  const fromHere = parsePlacement(useQueryParam("from")) === placement;
  const redirected =
    redirectedProp ?? (fromHere ? { subscribed: subscribedParam ?? undefined, welcome: welcomeParam ?? undefined, error: errorParam ?? undefined } : {});
  const outcome = welcome ?? (redirected.subscribed === "1" ? parseWelcome(redirected.welcome) : null);
  const redirectError = redirected.subscribed === "0" ? (newsletterError(redirected.error) ?? NEWSLETTER_ERRORS.invalid) : null;
  const shownError = error ?? (state === "idle" && !edited ? redirectError : null);
  const errorId = `${id}-error`;
  const describedBy = [hint ? `${id}-hint` : null, shownError ? errorId : null].filter(Boolean).join(" ") || undefined;

  // The submit button unmounts with the form, which drops focus to <body>: hand it to the checklist link instead.
  useEffect(() => {
    if (welcome && (!document.activeElement || document.activeElement === document.body)) live.current?.querySelector("a")?.focus();
  }, [welcome]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    // The server's own rule, so an address it would turn down (a@b) never costs a round trip. The server still checks.
    if (!isEmail(email)) {
      setError(NEWSLETTER_ERRORS.invalid);
      field.current?.focus();
      return;
    }
    setState("loading");
    setError(null);
    try {
      // The server records newsletter_subscribed on this page's id; the email never goes to analytics.
      const res = await postJson<{ welcome?: WelcomeOutcome }>("/api/newsletter", {
        email,
        placement,
        analyticsId: pageAnalyticsId(),
        isWebdriver: navigator.webdriver === true,
        ...(isTestVisit() ? { isTest: true } : {}),
      });
      setWelcome(parseWelcome(res.welcome));
    } catch (err) {
      setError(newsletterRequestError(err));
    }
    setState("idle");
  }

  return (
    <div ref={root}>
      {outcome ? null : (
        <form
          onSubmit={onSubmit}
          method="post"
          action="/api/newsletter"
          // Before hydration the browser checks `pattern`; after it, onSubmit shows our message instead of the browser's bubble.
          noValidate={hydrated}
          // A flex gap skips display:none children, so the hidden no-JS messages below don't add space that hydration takes away.
          className="flex flex-col gap-2"
          {...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": "Newsletter signup" })}
          data-placement={placement}
        >
          <input type="hidden" name="placement" value={placement} />
          {returnTo ? <input type="hidden" name="next" value={returnTo} /> : null}
          <label htmlFor={`${id}-email`} className={hideLabel ? "sr-only" : "text-sm font-medium"}>
            {label}
          </label>
          {/* Stacked below sm so the field isn't squeezed on a phone; 44px targets, and the Input's 16px text stops iOS zooming on focus. */}
          <div className="flex max-w-sm flex-col gap-2 sm:flex-row">
            <Input
              ref={field}
              id={`${id}-email`}
              name="email"
              type="email"
              required
              pattern={EMAIL_PATTERN}
              maxLength={EMAIL_MAX}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={shownError ? true : undefined}
              aria-describedby={describedBy}
              onChange={() => {
                setError(null);
                setEdited(true);
              }}
              className="h-11 bg-background"
            />
            <Button
              type="submit"
              size="lg"
              variant={buttonVariant}
              disabled={state === "loading"}
              className="h-11 w-full sm:w-auto"
            >
              {state === "loading" ? "Joining…" : buttonLabel}
            </Button>
          </div>
          {hint ? (
            <p id={`${id}-hint`} className="text-xs text-muted-foreground">
              {hint}
            </p>
          ) : null}
          {shownError ? (
            <p id={errorId} className="text-sm text-destructive" role="alert">
              {shownError}
            </p>
          ) : null}
          {/* A static page can't read ?error= on the server, so until JS runs the post's redirect reveals one of these by its #hash. */}
          {hydrated || redirectError
            ? null
            : (Object.keys(NEWSLETTER_ERRORS) as NewsletterErrorCode[]).map((code) => (
                <p key={code} id={newsletterErrorAnchor(placement, code)} className="hidden text-sm text-destructive target:block">
                  {NEWSLETTER_ERRORS[code]}
                </p>
              ))}
        </form>
      )}
      {/* Mounted (empty) before any submit: screen readers only announce changes to a live region that already exists. */}
      <div
        ref={live}
        role="status"
        className="space-y-1 text-sm"
        {...(outcome ? { "data-testid": `newsletter-done-${placement}`, "data-welcome": outcome } : {})}
      >
        {outcome ? <Subscribed welcome={outcome} /> : null}
      </div>
    </div>
  );
}

/** Only says an email is on its way when this signup actually sent one. */
function Subscribed({ welcome }: { welcome: WelcomeOutcome }) {
  const link = (text: string) => (
    <Link href={LEAD_MAGNET.path} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
      {text}
    </Link>
  );
  return (
    <>
      {welcome === "existing" ? (
        <p className="font-medium">You&apos;re already on the list. Here&apos;s the {LEAD_MAGNET.title}:</p>
      ) : (
        <p className="font-medium">You&apos;re subscribed. One useful launch teardown a week, no spam.</p>
      )}
      {welcome === "sent" ? (
        <p className="text-muted-foreground">
          {link(`Open your ${LEAD_MAGNET.title}`)}. I&apos;ve emailed you the link too.
        </p>
      ) : welcome === "skipped" ? (
        <p className="text-muted-foreground">
          Here&apos;s the {LEAD_MAGNET.title}: {link("Open the checklist")}
        </p>
      ) : (
        <p className="text-muted-foreground">{link("Open the checklist")}</p>
      )}
    </>
  );
}
