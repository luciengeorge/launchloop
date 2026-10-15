import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { PendingForm } from "./pending-form";

const linkCls = "text-sm text-muted-foreground transition-colors hover:text-foreground";

export function LogInLink() {
  return (
    <Link href="/login" className={linkCls} data-testid="nav-login">
      Log in
    </Link>
  );
}

/** Logged-in header links. Session already known by SiteHeader. */
export function AuthedNav() {
  return (
    <div className="flex items-center gap-3 sm:gap-4" data-testid="nav-authed">
      <Link href="/account" className={linkCls} data-testid="nav-my-kits">
        My kits
      </Link>
      <PendingForm method="post" action="/api/auth/logout">
        <LogoutButton className={linkCls} />
      </PendingForm>
    </div>
  );
}
