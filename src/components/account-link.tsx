import Link from "next/link";
import { getSession } from "@/lib/auth";

const linkCls = "inline-flex h-8 items-center text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground";

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
    // flex, not block: a block form adds a 16px line box and the button would sit on its baseline, not centred.
    <form method="post" action="/api/auth/logout" className="flex" data-testid="nav-authed">
      <button type="submit" className={`${linkCls} cursor-pointer`} data-testid="nav-logout">
        Log out
      </button>
    </form>
  );
}
