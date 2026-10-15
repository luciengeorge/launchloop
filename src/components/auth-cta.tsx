import { getSession } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { StartLink } from "./start-link";

/** Primary CTA only when logged out — logged-in users use My kits / account. */
export async function AuthCta() {
  const session = await getSession();
  if (session) return null;
  return (
    <StartLink plan="kit" className={buttonVariants({ size: "lg", className: "px-4" })}>
      Get my launch kit
    </StartLink>
  );
}
