"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/client";

export function LoginForm({ error, next }: { error?: string; next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState(error);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setErr(undefined);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      await postJson("/api/auth/request", { email, next });
      router.push("/login/check-email");
    } catch (ex) {
      setErr((ex as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} method="post" action="/api/auth/request" className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-10" disabled={pending} />
      </div>
      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full text-base" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Sending…" : "Email me a login link"}
      </Button>
    </form>
  );
}
