import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/lib/auth";
import { loginError } from "@/lib/login-errors";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Log in to LaunchLoop</h1>
          <p className="text-sm text-muted-foreground">We&apos;ll email you a sign-in link and a 6-digit code. No password needed. Kits you made in this browser are saved to your account.</p>
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
  return <LoginForm error={loginError(q.error)} next={safeNext(q.next)} email={typeof q.email === "string" ? q.email : undefined} />;
}
