"use client";

import { captureClientException } from "@/lib/sentry-client";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function KitError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureClientException(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">We couldn&apos;t load this kit</h1>
      <p className="text-muted-foreground">Your kit is safe. This is usually a blip, so try again. Paid kits are also in your email and under My kits.</p>
      {error.digest ? <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
      <div className="flex gap-2">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <Link href="/account" className={buttonVariants({ size: "lg", variant: "outline" })}>
          My kits
        </Link>
      </div>
    </div>
  );
}
