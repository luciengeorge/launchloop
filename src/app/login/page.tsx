import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  invalid: "Enter a valid email address.",
  rate: "Too many login links requested. Try again in an hour.",
  send: "We couldn't send your login link. Please try again.",
  expired: "That login link has expired or was already used. Request a new one.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Log in to LaunchLoop</h1>
          <p className="text-sm text-muted-foreground">We&apos;ll email you a one-time link. No password needed. Kits you made in this browser are saved to your account.</p>
        </div>
        <Suspense fallback={<LoginForm />}>
          <LoginFormWithQuery searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function LoginFormWithQuery({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const q = await searchParams;
  const error = typeof q.error === "string" ? ERRORS[q.error] : undefined;
  return <LoginForm error={error} next={safeNext(q.next)} />;
}

function LoginForm({ error, next }: { error?: string; next?: string }) {
  return (
    <form method="post" action="/api/auth/request" className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-10" />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full text-base">
        Email me a login link
      </Button>
    </form>
  );
}
