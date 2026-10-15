import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Confirm log in", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function VerifyPage({ searchParams }: PageProps<"/login/verify">) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Log in to LaunchLoop</h1>
      <Suspense fallback={null}>
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
  // Consuming happens on POST so email link scanners can't use up the token.
  return (
    <form method="post" action="/api/auth/verify" className="mt-6">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" className="h-11 w-full text-base">
        Continue to my kits
      </Button>
    </form>
  );
}
