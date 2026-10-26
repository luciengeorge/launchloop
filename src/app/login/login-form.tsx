"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/client";
import { loginRequestError } from "@/lib/form-errors";

/**
 * Posts with fetch once hydrated, so errors show inline and the email stays filled in; before hydration it's a
 * native POST that redirects to check-email or /login?error=…. Either way the button stays locked while the request
 * is in flight.
 */
export function LoginForm({ error, next, email }: { error?: string; next?: string; email?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState(error);
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setPending(true);
    setMessage(undefined);
    try {
      await postJson("/api/auth/request", { email, next });
      router.push("/login/check-email");
    } catch (err) {
      setMessage(loginRequestError(err));
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form method="post" action="/api/auth/request" onSubmit={onSubmit} className="space-y-4" aria-busy={pending || undefined}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={email}
          placeholder="you@example.com"
          readOnly={pending}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? "login-error" : undefined}
          className="h-10"
        />
      </div>
      {message ? (
        <p id="login-error" className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full text-base" disabled={pending} data-testid="login-submit">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Sending…" : "Email me a login link"}
      </Button>
    </form>
  );
}
