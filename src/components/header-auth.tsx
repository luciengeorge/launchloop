"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import { hasSessionHint } from "@/lib/session-hint";
import { KitPrice } from "./kit-price";
import { StartLink } from "./start-link";

const linkCls = "inline-flex h-8 shrink-0 items-center whitespace-nowrap text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground";
const ctaCls = buttonVariants({ size: "lg", className: "px-3 sm:px-4" });

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
        {promo ? (
          // Two prices don't fit beside the logo and "Log in" on a phone, or beside the nav links from md to lg, with the full label.
          <StartLink plan="kit" className={ctaCls}>
            <span className="sm:max-md:hidden lg:hidden">Get kit, </span>
            <span className="max-sm:hidden md:max-lg:hidden">Get my launch kit, </span>
            <KitPrice promo />
          </StartLink>
        ) : (
          <StartLink plan="kit" className={ctaCls}>
            {/* Phones show "Get my kit, £19" so the header fits in 360px; the accessible name keeps "launch". */}
            <span>
              Get my <span className="max-sm:sr-only">launch </span>kit, <KitPrice promo={false} />
            </span>
          </StartLink>
        )}
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
