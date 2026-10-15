import Link from "next/link";
import { getSession } from "@/lib/auth";

const linkCls = "text-sm text-muted-foreground transition-colors hover:text-foreground";

export function LogInLink() {
  return (
    <Link href="/login" className={linkCls} data-testid="nav-login">
      Log in
    </Link>
  );
}

/** Streams in behind a Suspense boundary so the rest of the header stays in the static shell. */
export async function AccountNav() {
  const session = await getSession();
  if (!session) {
    return <LogInLink />;
  }
  return (
    <div className="flex items-center gap-3 sm:gap-4" data-testid="nav-authed">
      <Link href="/account" className={linkCls} data-testid="nav-my-kits">
        My kits
      </Link>
      <form method="post" action="/api/auth/logout">
        <button type="submit" className={linkCls} data-testid="nav-logout">
          Log out
        </button>
      </form>
    </div>
  );
}
