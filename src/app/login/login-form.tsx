"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/client";
import { LOGIN_ERRORS } from "@/lib/login-errors";

/** Posts with fetch once hydrated, so errors show inline and the email stays filled in; plain form post before that. */
export function LoginForm({ error, next }: { error?: string; next?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState(error);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setLoading(true);
    setMessage(undefined);
    try {
      await postJson("/api/auth/request", { email, next });
      router.push("/login/check-email");
    } catch (err) {
      setMessage(err instanceof TypeError ? LOGIN_ERRORS.send : (err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form method="post" action="/api/auth/request" onSubmit={onSubmit} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
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
      <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
        {loading ? "Sending…" : "Email me a login link"}
      </Button>
    </form>
  );
}
