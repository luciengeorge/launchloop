import Link from "next/link";
import { getSession } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { StartLink } from "./start-link";

const ctaCls = buttonVariants({ size: "lg", className: "px-4" });

export function LaunchKitCta() {
  return (
    <StartLink plan="kit" className={ctaCls}>
      Get my launch kit
    </StartLink>
  );
}

/** Header primary CTA: Get my launch kit when logged out, My kits when logged in. */
export async function AuthCta() {
  const session = await getSession();
  if (!session) return <LaunchKitCta />;
  return (
    <Link href="/account" className={ctaCls} data-testid="nav-my-kits">
      My kits
    </Link>
  );
}
