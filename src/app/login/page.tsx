import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { getSession, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  invalid: "Enter a valid email address.",
  rate: "Too many login links requested. Try again in an hour.",
  send: "We couldn't send your login link. Please try again.",
  expired: "That login link has expired or was already used. Request a new one.",
  code: "That code didn't work or has expired. Request a new login email.",
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
          <LoginGate searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

/** Redirects authed users away from /login (magic-link verify stays at /login/verify). */
async function LoginGate({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const [session, q] = await Promise.all([getSession(), searchParams]);
  if (session) {
    redirect(safeNext(q.next) ?? "/account");
  }
  const error = typeof q.error === "string" ? ERRORS[q.error] : undefined;
  return <LoginForm error={error} next={safeNext(q.next)} />;
}
