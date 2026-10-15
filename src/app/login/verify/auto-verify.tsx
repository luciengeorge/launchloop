"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Submits the token by POST as soon as the page runs JS. Link scanners fetch the
 * GET page but don't run scripts or POST, so they can't burn the token; people
 * never see a confirm step. Without JS the page falls back to the email code.
 */
export function AutoVerify({ token }: { token: string }) {
  const form = useRef<HTMLFormElement>(null);
  const sent = useRef(false);
  useEffect(() => {
    // One submit only (Strict Mode re-runs effects; a second POST would hit a used token).
    if (sent.current) return;
    sent.current = true;
    form.current?.requestSubmit();
  }, []);
  return (
    <form ref={form} method="post" action="/api/auth/verify" className="mt-6" data-testid="auto-verify">
      <input type="hidden" name="token" value={token} />
      <p className="flex items-center justify-center gap-2 text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Logging you in…
      </p>
    </form>
  );
}
