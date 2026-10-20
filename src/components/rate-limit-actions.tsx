"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { waitLabel } from "@/lib/errors";
import { KitPrice } from "./kit-price";

const ACTION = "h-11 w-full px-5 text-base sm:w-auto";

/**
 * The free-preview limit's way forward, so the box is never a dead end. Primary: unlock the visitor's newest
 * preview when the server found one, otherwise the pricing page. Secondary: "Try again in N min", counting
 * down to the limiter's reset (`retryAt`, epoch ms), then a retry of the same input.
 */
export function RateLimitActions({ kitId, retryAt, promo, onRetry }: { kitId?: string; retryAt: number; promo: boolean; onRetry: () => void }) {
  const [now, setNow] = useState(Date.now);
  const secondsLeft = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const ready = secondsLeft === 0;
  useEffect(() => {
    if (ready) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ready]);

  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap" data-testid="rate-limit-actions">
      {kitId ? (
        <Link href={`/kit/${kitId}`} className={buttonVariants({ className: ACTION })} data-testid="rate-limit-unlock">
          Unlock my kit, <KitPrice promo={promo} />
        </Link>
      ) : (
        <Link href="/pricing" className={buttonVariants({ className: ACTION })} data-testid="rate-limit-pricing">
          See the Launch Kit, <KitPrice promo={promo} />
        </Link>
      )}
      <Button type="button" variant="outline" className={ACTION} disabled={!ready} onClick={onRetry} data-testid="rate-limit-retry">
        {ready ? "Try again" : `Try again in ${waitLabel(secondsLeft)}`}
      </Button>
    </div>
  );
}
