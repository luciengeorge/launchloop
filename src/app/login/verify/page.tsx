import type { Metadata } from "next";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { AutoVerify } from "./auto-verify";

export const metadata: Metadata = { title: "Confirm log in", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function VerifyPage({ searchParams }: PageProps<"/login/verify">) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Log in to LaunchLoop</h1>
      <Suspense fallback={<VerifyFallback />}>
        <VerifyForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function VerifyForm({ searchParams }: Pick<PageProps<"/login/verify">, "searchParams">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return (
      <p className="mt-3 text-muted-foreground">
        This link is incomplete. <Link href="/login" className="underline">Request a new one</Link>.
      </p>
    );
  }
  // Consuming happens on POST (auto-submitted by JS) so email link scanners can't use up the token.
  return <AutoVerify token={token} />;
}

/**
 * Static shell. With JS, the token form streams in and auto-submits. Without JS the
 * streamed part never shows (it needs a script to swap in), so offer the email code instead.
 */
function VerifyFallback() {
  return (
    <>
      <p className="mt-6 flex items-center justify-center gap-2 text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Logging you in…
      </p>
      <noscript>
        <form method="post" action="/api/auth/verify" className="mt-6 space-y-3 text-left" data-testid="noscript-code-form">
          <p className="text-sm text-muted-foreground">JavaScript is off. Enter your email and the 6-digit code from the login email instead.</p>
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required autoComplete="email" className="mt-1 h-10 w-full rounded-md border px-3" />
          </label>
          <label className="block text-sm font-medium">
            6-digit code
            <input name="code" inputMode="numeric" pattern="[0-9]{6}" required autoComplete="one-time-code" className="mt-1 h-10 w-full rounded-md border px-3 font-mono tracking-widest" />
          </label>
          <button type="submit" className="h-11 w-full rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground">
            Log in
          </button>
        </form>
      </noscript>
    </>
  );
}
