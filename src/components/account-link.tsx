import Link from "next/link";
import { getSession } from "@/lib/auth";

const cls = "text-sm text-muted-foreground transition-colors hover:text-foreground";

export function LogInLink() {
  return (
    <Link href="/login" className={cls}>
      Log in
    </Link>
  );
}

/** Streams in behind a Suspense boundary so the rest of the header stays in the static shell. */
export async function AccountLink() {
  const session = await getSession();
  if (!session) return <LogInLink />;
  return (
    <Link href="/account" className={cls}>
      My kits
    </Link>
  );
}
