import { buttonVariants } from "@/components/ui/button";
import { StartLink } from "./start-link";

/** Primary CTA for logged-out users. Prefer rendering via SiteHeader with a known session. */
export function AuthCta() {
  return (
    <StartLink plan="kit" className={buttonVariants({ size: "lg", className: "px-4" })}>
      Get my launch kit
    </StartLink>
  );
}
