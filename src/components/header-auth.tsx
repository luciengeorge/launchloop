"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import { hasSessionHint } from "@/lib/session-hint";
import { KitPrice } from "./kit-price";
import { StartLink } from "./start-link";

const linkCls = "inline-flex h-8 items-center text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground";
const ctaCls = buttonVariants({ size: "lg", className: "px-4" });

// Login and logout are full page loads, so this only needs to catch pages restored from the back/forward cache.
function subscribe(onChange: () => void) {
  window.addEventListener("pageshow", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("pageshow", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/**
 * Header account links and primary CTA. Reads the readable session hint cookie in the browser, so every page
 * (including CDN-cached ones like the home page) can stay fully static. The server always renders the signed-out
 * state; the real session is still checked by /account and every API that needs it.
 */
export function HeaderAuth({ promo }: { promo: boolean }) {
  const signedIn = useSyncExternalStore(subscribe, hasSessionHint, () => false);
  if (!signedIn) {
    return (
      <>
        <Link href="/login" className={linkCls} data-testid="nav-login">
          Log in
        </Link>
        <StartLink plan="kit" className={ctaCls}>
          Get my launch kit, <KitPrice promo={promo} />
        </StartLink>
      </>
    );
  }
  return (
    <>
      {/* flex, not block: a block form adds a 16px line box and the button would sit on its baseline, not centred. */}
      <form method="post" action="/api/auth/logout" className="flex" data-testid="nav-authed">
        <button type="submit" className={`${linkCls} cursor-pointer`} data-testid="nav-logout">
          Log out
        </button>
      </form>
      <Link href="/account" className={ctaCls} data-testid="nav-my-kits">
        My kits
      </Link>
    </>
  );
}
