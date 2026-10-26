"use client";

import { ArrowRight, BookmarkCheck, Check, Loader2, Lock, Mail } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyticsId } from "@/lib/analytics";
import { postJson } from "@/lib/client";
import { EXPERIMENTS, type Served } from "@/lib/experiments";
import { signInCodeError, signInLinkError } from "@/lib/form-errors";
import { useClaimPrimaryCta } from "@/lib/primary-cta";
import { LAUNCH_PROMO } from "@/lib/products";
import { trackUnlockClicked, type UnlockContext } from "@/lib/unlock-checkout";
import { useServerAssignment } from "@/lib/use-experiment";
import { usePageRestored, useUnlockButtonRef, useUnlockCheckout } from "./unlock-checkout";
import { ActionableError, CheckoutError, SAVE_PREVIEW_FIELD_ID } from "./unlock-error";

const EMAIL_KEY = "launchloop:email";

interface Props {
  kitId: string;
  /** Full kit price. The exp_launch14_promo treatment shows it struck through next to the LAUNCH14 price. */
  priceLabel: string;
  /**
   * This kit's exp_launch14_promo assignment (or fallback) from resolveKitPromo, resolved on the server before the
   * panel renders, the same way /api/checkout resolves it. The price, the LAUNCH14 note and the button all come from it.
   */
  launchPromo: Served;
  /** Logged-in email, if any. */
  email?: string;
  /** Arrived from the magic link (or the "£19 kit" plan): go straight to checkout. */
  autoCheckout: boolean;
  cancelled: boolean;
  /** Arrived from a "save this preview" link. */
  saved: boolean;
}

type Step = "cta" | "email" | "sent" | "redirecting";
type SaveState = "idle" | "sending" | "sent";
/** The panel's own errors: the sign-in link didn't send, or the code didn't sign in. Checkout's are shared (useUnlockCheckout). */
type LoginError = { kind: "link" | "code"; message: string };

/**
 * Signed in: Unlock → Stripe Checkout with the account email → the unlocked kit in /account.
 * Signed out: Unlock → Stripe Checkout as a guest (Stripe collects the email) → a success page that sends a
 * magic link to that email, whose first login claims the kit. They can also sign in first (magic link, returns
 * here, then checkout), or just email themselves a link that saves the preview.
 */
export function UnlockPanel({ kitId, priceLabel, launchPromo, email, autoCheckout, cancelled, saved }: Props) {
  const [ownStep, setStep] = useState<Step>(autoCheckout ? "redirecting" : "cta");
  const [address, setAddress] = useState(email ?? "");
  const [error, setError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [signedIn, setSignedIn] = useState(email);
  const [save, setSave] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const started = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const promoVariant = useServerAssignment(EXPERIMENTS.launchPromo, launchPromo).variant;
  useClaimPrimaryCta();
  const unlock = useUnlockCheckout();
  // Its own "redirecting" (a checkout that left, or the code login on its way to the account) is over once the page is back.
  usePageRestored(() => {
    setStep((s) => (s === "redirecting" ? "cta" : s));
    setLoading(false);
  });
  const { fullPriceUrl } = unlock;
  const promo = promoVariant === "treatment" && !fullPriceUrl;
  const shownPrice = promo ? LAUNCH_PROMO.priceLabel : priceLabel;
  // Checkout started from the early CTA or the sticky bar shows here too.
  const step: Step = unlock.redirecting ? "redirecting" : ownStep;
  const context: UnlockContext = { kitId, position: "panel", earlyCta: unlock.earlyCta, isLoggedIn: !!signedIn };
  const failed = unlock.failed?.position === "panel" ? unlock.failed : null;
  const checkoutFailure = failed?.failure ?? null;
  const unlockRef = useUnlockButtonRef(context, failed?.attempt);
  const errorId = useId();
  /** Set by a click: the button and its error leave while checkout starts, so focus waits on the status line instead. */
  const focusStatus = useRef(false);
  const statusRef = useCallback((element: HTMLParagraphElement | null) => {
    if (!element || !focusStatus.current) return;
    focusStatus.current = false;
    element.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (email) return;
    try {
      const stored = localStorage.getItem(EMAIL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from storage after mount
      if (stored) setAddress((a) => a || stored);
    } catch {
      // Storage blocked.
    }
  }, [email]);

  useEffect(() => {
    if (step === "email") inputRef.current?.focus();
  }, [step]);

  function remember(value: string) {
    try {
      localStorage.setItem(EMAIL_KEY, value);
    } catch {
      // Storage blocked.
    }
  }

  /**
   * The server resolves the promo itself (the same way this page did); nothing about it is sent from here. Showed £14
   * but the session isn't discounted (Stripe turned the code down, or the kit left the promo arm since): the panel says
   * so, and the button then opens that full-price session.
   */
  async function checkout(retry = false, from: UnlockContext = context) {
    setLoading(true);
    setError(null);
    setStep("redirecting");
    if ((await unlock.start(from, { promo, retry })) !== "redirect") {
      setStep("cta");
      setLoading(false);
    }
  }

  function unlockClicked(retry: boolean) {
    trackUnlockClicked(context, retry);
    if (fullPriceUrl) return window.location.assign(fullPriceUrl);
    focusStatus.current = true;
    void checkout(retry);
  }

  useEffect(() => {
    if (autoCheckout && !started.current) {
      started.current = true;
      void checkout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on arrival
  }, []);

  async function verifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { next } = await postJson<{ next: string }>("/api/auth/verify", { email: address, code });
      if (next.startsWith(`/kit/${kitId}`)) {
        setSignedIn(address);
        await checkout(false, { ...context, isLoggedIn: true });
      } else {
        setStep("redirecting");
        window.location.assign(next);
      }
    } catch (err) {
      setError({ kind: "code", message: signInCodeError(err) });
      setLoading(false);
    }
  }

  /** Emails the sign-in link and code (again, for "Try again" or "Resend code"). */
  async function requestLink() {
    setLoading(true);
    setError(null);
    remember(address);
    try {
      await postJson("/api/auth/request", { email: address, intent: { type: "unlock", kitId, aid: await analyticsId() } });
      setCode("");
      setStep("sent");
    } catch (err) {
      setError({ kind: "link", message: signInLinkError(err) });
    } finally {
      setLoading(false);
    }
  }

  function sendLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void requestLink();
  }

  function savePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void requestSave();
  }

  async function requestSave() {
    setSave("sending");
    setSaveError(null);
    remember(address);
    try {
      await postJson("/api/auth/request", { email: address, intent: { type: "save", kitId, aid: await analyticsId() } });
      setSave("sent");
    } catch (err) {
      setSaveError(signInLinkError(err));
      setSave("idle");
    }
  }

  return (
    <section aria-labelledby="unlock-heading" data-testid="unlock-panel" data-step={step}>
      <h3 id="unlock-heading" className="text-sm font-medium text-muted-foreground">
        The full kit
      </h3>
      <p className="mt-1" data-testid="kit-price">
        {promo ? (
          <>
            <s className="mr-2 text-2xl text-muted-foreground">
              <span className="sr-only">Was </span>
              {priceLabel}
            </s>
            <span className="text-4xl font-semibold tracking-tight">
              <span className="sr-only">now </span>
              {LAUNCH_PROMO.priceLabel}
            </span>
          </>
        ) : (
          <span className="text-4xl font-semibold tracking-tight">{priceLabel}</span>
        )}
        <span className="ml-1.5 text-sm text-muted-foreground">once, no subscription</span>
      </p>
      {promo ? (
        <p className="mt-2 rounded-md bg-primary/10 px-3 py-2 text-xs" data-testid="launch-promo">
          <span className="font-mono font-semibold text-primary">{LAUNCH_PROMO.code}</span> takes £5 off, applied for you at checkout. Launch offer for first-time buyers, while it
          lasts.
        </p>
      ) : null}
      {fullPriceUrl ? (
        <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs" role="status" data-testid="promo-unavailable">
          {LAUNCH_PROMO.code} can&apos;t be used on this purchase: it&apos;s for first-time buyers and the launch offer may have ended. The kit is {priceLabel}.
        </p>
      ) : null}

      <UnlockSteps signedIn={signedIn} />
      <UnlockNotes cancelled={cancelled} saved={saved && !!signedIn} />

      {step === "cta" ? (
        <Button
          ref={unlockRef}
          aria-describedby={checkoutFailure ? errorId : undefined}
          type="button"
          className="mt-6 h-11 w-full text-base"
          onClick={() => unlockClicked(false)}
          disabled={loading}
        >
          <Lock aria-hidden="true" />
          {`Unlock the full kit, ${shownPrice}`}
        </Button>
      ) : null}
      {step === "cta" && !signedIn ? <LoginFirst onClick={() => setStep("email")} /> : null}

      {step === "email" ? (
        <form onSubmit={sendLink} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="unlock-email">Your email</Label>
            <Input ref={inputRef} id="unlock-email" name="email" type="email" required autoComplete="email" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="you@example.com" className="h-10 bg-background" />
            <p className="text-xs text-muted-foreground">We&apos;ll email you a sign-in link and a 6-digit code. Your kit and progress live in your account.</p>
          </div>
          <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null}
            Continue to checkout
            {loading ? null : <ArrowRight aria-hidden="true" />}
          </Button>
        </form>
      ) : null}

      {step === "sent" ? (
        <div className="mt-6 space-y-3 rounded-xl bg-background p-4 text-sm" role="status">
          <p className="flex items-center gap-2 font-medium">
            <Mail className="size-4" aria-hidden="true" /> Check {address}
          </p>
          <p className="text-muted-foreground">Type the 6-digit code from the email here, or click its link (on any device) to come straight back to checkout. Both expire in 15 minutes.</p>
          <form onSubmit={verifyCode} className="flex gap-2">
            <Label htmlFor="unlock-code" className="sr-only">
              6-digit code
            </Label>
            <Input
              id="unlock-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="h-10 bg-background font-mono text-lg tracking-[0.3em]"
            />
            <Button type="submit" className="h-10" disabled={loading || code.length !== 6}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              Verify
            </Button>
          </form>
          <button type="button" className="text-xs font-medium underline underline-offset-4" onClick={() => setStep("email")}>
            Use a different email or resend
          </button>
        </div>
      ) : null}

      {step === "redirecting" ? <Redirecting ref={statusRef} /> : null}

      {checkoutFailure ? <CheckoutError failure={checkoutFailure} isLoggedIn={!!signedIn} onRetry={() => unlockClicked(true)} messageId={errorId} /> : null}
      {error?.kind === "link" ? (
        <ActionableError
          message={error.message}
          actions={[
            { label: "Try again", onClick: () => void requestLink(), testId: "login-link-retry" },
            { label: "Pay as a guest instead", onClick: () => unlockClicked(false), testId: "login-link-guest" },
          ]}
          testId="login-link-error"
        />
      ) : null}
      {error?.kind === "code" ? (
        <ActionableError
          message={error.message}
          actions={[
            { label: "Resend code", onClick: () => void requestLink(), testId: "login-code-resend" },
            {
              label: "Use a different email",
              onClick: () => {
                setError(null);
                setStep("email");
              },
              testId: "login-code-other-email",
            },
          ]}
          testId="login-code-error"
        />
      ) : null}
      <CheckoutNote />

      {step === "cta" && !signedIn ? (
        <div className="mt-6 border-t border-border pt-5" data-testid="save-preview">
          {save === "sent" ? (
            <p className="flex items-start gap-2 text-sm" role="status">
              <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Link sent to <span className="font-medium">{address}</span>. Open it on any device and this preview is saved to your account.
              </span>
            </p>
          ) : (
            <form onSubmit={savePreview} className="space-y-2">
              <SavePreviewFields htmlFor={SAVE_PREVIEW_FIELD_ID}>
                <Input id={SAVE_PREVIEW_FIELD_ID} name="email" type="email" required autoComplete="email" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="you@example.com" className="h-9 bg-background" />
                <Button type="submit" variant="outline" className="h-9" disabled={save === "sending"}>
                  {save === "sending" ? <Loader2 className="animate-spin" /> : null}
                  Email me a link
                </Button>
              </SavePreviewFields>
              {saveError ? (
                <ActionableError
                  message={saveError}
                  actions={[{ label: "Try again", onClick: () => void requestSave(), testId: "save-preview-retry" }]}
                  size="xs"
                  className="mt-0"
                  testId="save-preview-error"
                />
              ) : null}
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}

interface PlaceholderProps {
  /** Logged-in email, if any. */
  email?: string;
  autoCheckout: boolean;
  cancelled: boolean;
  saved: boolean;
}

/**
 * Stands in for UnlockPanel until the kit's promo resolves: no price at all, rather than one that might change, but
 * otherwise the same rows as the full-price panel, so the unlock button is already where it will be. (The LAUNCH14
 * arm adds one line above it.)
 */
export function UnlockPanelPlaceholder({ email, autoCheckout, cancelled, saved }: PlaceholderProps) {
  return (
    <section aria-label="The full kit" aria-busy="true" data-testid="unlock-panel-loading">
      <h3 className="text-sm font-medium text-muted-foreground">The full kit</h3>
      <p className="mt-1">
        <span className="text-4xl font-semibold tracking-tight">
          <span className="inline-block h-10 w-16 animate-pulse rounded-md bg-muted align-bottom" aria-label="Loading price" />
        </span>
        <span className="ml-1.5 text-sm text-muted-foreground">once, no subscription</span>
      </p>
      <UnlockSteps signedIn={email} />
      <UnlockNotes cancelled={cancelled} saved={saved && !!email} placeholder />
      {autoCheckout ? (
        // The height of the "Taking you to secure checkout" line, which the panel shows at once.
        <div className="mt-6 h-5" />
      ) : (
        <Button type="button" className="mt-6 h-11 w-full text-base" disabled>
          <Lock aria-hidden="true" />
          Unlock the full kit
        </Button>
      )}
      {!autoCheckout && !email ? <LoginFirst /> : null}
      <CheckoutNote />
      {!autoCheckout && !email ? (
        <div className="mt-6 space-y-2 border-t border-border pt-5">
          <SavePreviewFields>
            <Input type="email" disabled placeholder="you@example.com" className="h-9 bg-background" />
            <Button type="button" variant="outline" className="h-9" disabled>
              Email me a link
            </Button>
          </SavePreviewFields>
        </div>
      ) : null}
    </section>
  );
}

function UnlockSteps({ signedIn }: { signedIn?: string }) {
  return (
    <ol className="mt-5 space-y-2 text-sm" aria-label="How unlocking works">
      {signedIn ? (
        <>
          <StepItem n={1} label={`Signed in as ${signedIn}`} done active={false} />
          <StepItem n={2} label="Pay securely with Stripe" done={false} active />
          <StepItem n={3} label="Your kit unlocks instantly" done={false} active={false} />
        </>
      ) : (
        <>
          <StepItem n={1} label="Pay securely with Stripe, no account needed" done={false} active />
          <StepItem n={2} label="Your kit unlocks instantly" done={false} active={false} />
          <StepItem n={3} label="Log in with the same email to find it in My kits" done={false} active={false} />
        </>
      )}
    </ol>
  );
}

/** In the placeholder, without the status role and test id: the panel's own copy is the one to announce and find. */
function UnlockNotes({ cancelled, saved, placeholder = false }: { cancelled: boolean; saved: boolean; placeholder?: boolean }) {
  const role = placeholder ? undefined : "status";
  return (
    <>
      {cancelled ? (
        <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs" role={role}>
          Checkout was cancelled. Your kit is saved here whenever you&apos;re ready.
        </p>
      ) : null}
      {saved ? (
        <p
          className="mt-4 flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800"
          role={role}
          data-testid={placeholder ? undefined : "preview-saved"}
        >
          <BookmarkCheck className="size-3.5" aria-hidden="true" /> Saved. This preview is in your account now.
        </p>
      ) : null}
    </>
  );
}

/** Without onClick (the placeholder), the same line with the link disabled. */
function LoginFirst({ onClick }: { onClick?: () => void }) {
  return (
    <p className="mt-2 text-center text-xs text-muted-foreground">
      Have an account?{" "}
      <button
        type="button"
        className="font-medium text-foreground underline underline-offset-4"
        onClick={onClick}
        disabled={!onClick}
        data-testid={onClick ? "unlock-login-first" : undefined}
      >
        Log in first
      </button>
    </p>
  );
}

/** Focusable from script only (tabIndex -1), to hold focus in place of the unlock button while checkout starts. */
function Redirecting({ ref }: { ref?: Ref<HTMLParagraphElement> }) {
  return (
    <p ref={ref} tabIndex={-1} className="mt-6 flex items-center justify-center gap-2 text-sm font-medium outline-none" role="status" data-testid="checkout-redirecting">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Taking you to secure checkout…
    </p>
  );
}

function CheckoutNote() {
  return <p className="mt-4 text-center text-xs text-muted-foreground">Secure checkout by Stripe · 14-day refund, no questions</p>;
}

/** The save-preview label, field row (children) and hint. */
function SavePreviewFields({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        Not ready yet? Save this preview
      </Label>
      <div className="flex gap-2">{children}</div>
      <p className="text-xs text-muted-foreground">Optional. A sign-in link that keeps this preview in your account. No password, no newsletter.</p>
    </>
  );
}

function StepItem({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${active || done ? "" : "text-muted-foreground"}`}>
      <span className={`flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        {done ? <Check className="size-3" aria-hidden="true" /> : n}
      </span>
      {label}
    </li>
  );
}
