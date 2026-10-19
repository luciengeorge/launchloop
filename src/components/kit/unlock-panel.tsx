"use client";

import { ArrowRight, BookmarkCheck, Check, Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyticsId } from "@/lib/analytics";
import { postJson, startCheckout } from "@/lib/client";
import { EXPERIMENTS, type Served } from "@/lib/experiments";
import { useClaimPrimaryCta } from "@/lib/primary-cta";
import { LAUNCH_PROMO } from "@/lib/products";
import { useServerAssignment } from "@/lib/use-experiment";

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

/**
 * Signed in: Unlock → Stripe Checkout with the account email → the unlocked kit in /account.
 * Signed out: Unlock → Stripe Checkout as a guest (Stripe collects the email) → a success page that sends a
 * magic link to that email, whose first login claims the kit. They can also sign in first (magic link, returns
 * here, then checkout), or just email themselves a link that saves the preview.
 */
export function UnlockPanel({ kitId, priceLabel, launchPromo, email, autoCheckout, cancelled, saved }: Props) {
  const [step, setStep] = useState<Step>(autoCheckout ? "redirecting" : "cta");
  const [address, setAddress] = useState(email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [signedIn, setSignedIn] = useState(email);
  const [save, setSave] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const started = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const promoVariant = useServerAssignment(EXPERIMENTS.launchPromo, launchPromo).variant;
  useClaimPrimaryCta();
  /** Full-price Checkout URL, set when the promo arm's LAUNCH14 was turned down by Stripe. */
  const [fullPriceUrl, setFullPriceUrl] = useState<string | null>(null);
  const promo = promoVariant === "treatment" && !fullPriceUrl;
  const shownPrice = promo ? LAUNCH_PROMO.priceLabel : priceLabel;

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

  async function checkout() {
    setLoading(true);
    setError(null);
    setStep("redirecting");
    try {
      // The server resolves the promo itself (the same way this page did); nothing about it is sent from here.
      const { url, promo: outcome } = await startCheckout("kit", kitId);
      // Showed £14 but the session isn't discounted (Stripe turned the code down, or the kit left the promo arm since): say so.
      if (outcome === "unavailable" || (promo && outcome !== "applied")) {
        setFullPriceUrl(url);
        setStep("cta");
        setLoading(false);
        return;
      }
      window.location.assign(url);
    } catch (err) {
      setError((err as Error).message);
      setStep("cta");
      setLoading(false);
    }
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
        await checkout();
      } else {
        setStep("redirecting");
        window.location.assign(next);
      }
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  async function sendLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    remember(address);
    try {
      await postJson("/api/auth/request", { email: address, intent: { type: "unlock", kitId, aid: await analyticsId() } });
      setCode("");
      setStep("sent");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function savePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSave("sending");
    setSaveError(null);
    remember(address);
    try {
      await postJson("/api/auth/request", { email: address, intent: { type: "save", kitId, aid: await analyticsId() } });
      setSave("sent");
    } catch (err) {
      setSaveError((err as Error).message);
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

      {cancelled ? (
        <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs" role="status">
          Checkout was cancelled. Your kit is saved here whenever you&apos;re ready.
        </p>
      ) : null}
      {saved && signedIn ? (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800" role="status" data-testid="preview-saved">
          <BookmarkCheck className="size-3.5" aria-hidden="true" /> Saved. This preview is in your account now.
        </p>
      ) : null}

      {step === "cta" ? (
        <Button
          type="button"
          className="mt-6 h-11 w-full text-base"
          onClick={() => (fullPriceUrl ? window.location.assign(fullPriceUrl) : void checkout())}
          disabled={loading}
        >
          <Lock aria-hidden="true" />
          {`Unlock the full kit, ${shownPrice}`}
        </Button>
      ) : null}
      {step === "cta" && !signedIn ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Have an account?{" "}
          <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => setStep("email")} data-testid="unlock-login-first">
            Log in first
          </button>
        </p>
      ) : null}

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

      {step === "redirecting" ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-medium" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Taking you to secure checkout…
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-4 text-center text-xs text-muted-foreground">Secure checkout by Stripe · 14-day refund, no questions</p>

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
              <Label htmlFor="save-email" className="text-sm font-medium">
                Not ready yet? Save this preview
              </Label>
              <div className="flex gap-2">
                <Input id="save-email" name="email" type="email" required autoComplete="email" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="you@example.com" className="h-9 bg-background" />
                <Button type="submit" variant="outline" className="h-9" disabled={save === "sending"}>
                  {save === "sending" ? <Loader2 className="animate-spin" /> : null}
                  Email me a link
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Optional. A sign-in link that keeps this preview in your account. No password, no newsletter.</p>
              {saveError ? (
                <p className="text-xs text-destructive" role="alert">
                  {saveError}
                </p>
              ) : null}
            </form>
          )}
        </div>
      ) : null}
    </section>
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
