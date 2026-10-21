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

/** `placeholder`: the copy SignedInLinks keeps invisible, so it carries no test ids. */
function SignedOutLinks({ promo, placeholder = false }: { promo: boolean; placeholder?: boolean }) {
  return (
    <>
      <Link href="/login" className={linkCls} data-testid={placeholder ? undefined : "nav-login"}>
        Log in
      </Link>
      {promo ? (
        // Two prices don't fit beside the logo and "Log in" on a phone, or beside the nav links from md to lg, with the full label.
        <StartLink plan="kit" className={ctaCls}>
          <span className="sm:max-md:hidden lg:hidden">Get kit, </span>
          <span className="max-sm:hidden md:max-lg:hidden">Get my launch kit, </span>
          <KitPrice promo placeholder={placeholder} />
        </StartLink>
      ) : (
        <StartLink plan="kit" className={ctaCls}>
          {/* Phones show "Get my kit, £19" so the header fits in 360px, and so does md to lg beside the nav links. Hidden, not
              sr-only, so the accessible name is always the visible label (voice control). */}
          <span>
            Get my <span className="max-sm:hidden md:max-lg:hidden">launch </span>kit, <KitPrice promo={false} />
          </span>
        </StartLink>
      )}
    </>
  );
}

/**
 * The signed-in links are narrower than the server-rendered signed-out ones. Keeping those in the layout, invisible,
 * holds the group's width, so the swap after hydration doesn't move it or the nav (a layout shift).
 */
export function SignedInLinks({ promo }: { promo: boolean }) {
  return (
    <div className="grid justify-items-end">
      <div className="invisible col-start-1 row-start-1 flex items-center gap-2.5 sm:gap-4" aria-hidden="true" inert>
        <SignedOutLinks promo={promo} placeholder />
      </div>
      <div className="col-start-1 row-start-1 flex items-center gap-2.5 sm:gap-4">
        {/* flex, not block: a block form adds a 16px line box and the button would sit on its baseline, not centred. */}
        <form method="post" action="/api/auth/logout" className="flex" data-testid="nav-authed">
          <button type="submit" className={`${linkCls} cursor-pointer`} data-testid="nav-logout">
            Log out
          </button>
        </form>
        <Link href="/account" className={ctaCls} data-testid="nav-my-kits">
          My kits
        </Link>
      </div>
    </div>
  );
}

/**
 * Header account links and primary CTA. Reads the readable session hint cookie in the browser, so every page
 * (including CDN-cached ones like the home page) can stay fully static. The server always renders the signed-out
 * state; the real session is still checked by /account and every API that needs it.
 */
export function HeaderAuth({ promo }: { promo: boolean }) {
  const signedIn = useSyncExternalStore(subscribe, hasSessionHint, () => false);
  return signedIn ? <SignedInLinks promo={promo} /> : <SignedOutLinks promo={promo} />;
}
