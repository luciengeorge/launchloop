"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Native POST so it works without JS. The API answers with a redirect (check-email on success, /login?error=… on failure),
 * so the button stays locked until that navigation replaces the page.
 */
export function LoginForm({ error, next }: { error?: string; next?: string }) {
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    // Back/forward cache restores the page with its old state; unlock so the form is usable again.
    const reset = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      submitting.current = false;
      setPending(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <form
      method="post"
      action="/api/auth/request"
      className="space-y-4"
      aria-busy={pending || undefined}
      onSubmit={(e) => {
        if (submitting.current) {
          e.preventDefault();
          return;
        }
        submitting.current = true;
        setPending(true);
      }}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-10" readOnly={pending} />
      </div>
      {error && !pending ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full text-base" disabled={pending} data-testid="login-submit">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Sending…" : "Email me a login link"}
      </Button>
    </form>
  );
}
