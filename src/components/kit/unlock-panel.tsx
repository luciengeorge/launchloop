"use client";

import { ArrowRight, Check, Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/client";

const EMAIL_KEY = "launchloop:email";

interface Props {
  kitId: string;
  priceLabel: string;
  /** Logged-in email, if any. */
  email?: string;
  /** Arrived from the magic link (or the "£19 kit" plan): go straight to checkout. */
  autoCheckout: boolean;
  cancelled: boolean;
  totalTasks: number;
}

type Step = "cta" | "email" | "sent" | "redirecting";

/**
 * Unlock → magic-link sign in (email prefilled, returns here) → Stripe Checkout
 * with the account email → back to the unlocked kit in /account.
 */
export function UnlockPanel({ kitId, priceLabel, email, autoCheckout, cancelled, totalTasks }: Props) {
  const [step, setStep] = useState<Step>(autoCheckout && email ? "redirecting" : autoCheckout ? "email" : "cta");
  const [address, setAddress] = useState(email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [signedIn, setSignedIn] = useState(email);
  const started = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (email) return;
    try {
      const saved = localStorage.getItem(EMAIL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from storage after mount
      if (saved) setAddress((a) => a || saved);
    } catch {
      // Storage blocked.
    }
  }, [email]);

  useEffect(() => {
    if (step === "email") inputRef.current?.focus();
  }, [step]);

  async function checkout() {
    setLoading(true);
    setError(null);
    setStep("redirecting");
    try {
      const { url } = await postJson<{ url: string }>("/api/checkout", { product: "kit", kitId });
      window.location.assign(url);
    } catch (err) {
      setError((err as Error).message);
      setStep("cta");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoCheckout && email && !started.current) {
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
    try {
      localStorage.setItem(EMAIL_KEY, address);
    } catch {
      // Storage blocked.
    }
    try {
      await postJson("/api/auth/request", { email: address, intent: { type: "unlock", kitId } });
      setCode("");
      setStep("sent");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10" aria-labelledby="unlock-heading" data-testid="unlock-panel" data-step={step}>
      <h2 id="unlock-heading" className="text-lg font-semibold">
        Your full kit is written. Unlock it.
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        One-off <span className="font-semibold text-foreground">{priceLabel}</span>. Every blurred section below, {totalTasks} launch steps, 3 images without watermarks and a ZIP.
      </p>

      <ol className="mt-5 space-y-2 text-sm" aria-label="How unlocking works">
        <StepItem n={1} label={signedIn ? `Signed in as ${signedIn}` : "Confirm your email (no password)"} done={!!signedIn} active={!signedIn} />
        <StepItem n={2} label="Pay securely with Stripe" done={false} active={!!signedIn} />
        <StepItem n={3} label="Your kit unlocks instantly" done={false} active={false} />
      </ol>

      {cancelled ? (
        <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs" role="status">
          Checkout was cancelled. Your kit is saved here whenever you&apos;re ready.
        </p>
      ) : null}

      {step === "cta" ? (
        <Button type="button" className="mt-6 h-11 w-full text-base" onClick={() => (email ? void checkout() : setStep("email"))} disabled={loading}>
          <Lock aria-hidden="true" />
          Unlock full kit for {priceLabel}
        </Button>
      ) : null}

      {step === "email" ? (
        <form onSubmit={sendLink} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="unlock-email">Your email</Label>
            <Input ref={inputRef} id="unlock-email" name="email" type="email" required autoComplete="email" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="you@example.com" className="h-10" />
            <p className="text-xs text-muted-foreground">We&apos;ll email a one-click sign-in link and a 6-digit code. Your kit and progress live in your account.</p>
          </div>
          <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null}
            Continue to checkout
            {loading ? null : <ArrowRight aria-hidden="true" />}
          </Button>
        </form>
      ) : null}

      {step === "sent" ? (
        <div className="mt-6 space-y-3 rounded-xl bg-muted/60 p-4 text-sm" role="status">
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
