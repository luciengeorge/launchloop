"use client";

import { useFormPending } from "./pending-form";

/** Plain text submit control for the navbar logout form. */
export function LogoutButton({ className }: { className?: string }) {
  const pending = useFormPending();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending || undefined} data-testid="nav-logout">
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
