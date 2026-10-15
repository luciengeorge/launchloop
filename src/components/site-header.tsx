import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { AuthedNav, LogInLink } from "./account-link";
import { AuthCta } from "./auth-cta";
import { Logo } from "./logo";

const NAV = [
  { href: "/#kit", label: "What you get" },
  { href: "/pricing", label: "Pricing" },
  { href: "/ship-loop", label: "Ship Loop" },
  { href: "/faq", label: "FAQ" },
];

/**
 * Static shell (logo + nav) stays prerenderable. Auth chrome streams in from the
 * server with the real session — fallback is a neutral skeleton so we never flash
 * the wrong "Log in" / "Get my launch kit" labels.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <Suspense fallback={<AuthChromeSkeleton />}>
          <AuthChrome />
        </Suspense>
      </div>
    </header>
  );
}

async function AuthChrome() {
  const session = await getSession();
  if (session) return <AuthedNav />;
  return (
    <div className="flex items-center gap-3 sm:gap-4" data-testid="nav-guest">
      <LogInLink />
      <AuthCta />
    </div>
  );
}

/** Same footprint as Log in + CTA; no labels that would be wrong for either state. */
function AuthChromeSkeleton() {
  return (
    <div className="flex items-center gap-3 sm:gap-4" aria-hidden="true" data-testid="nav-auth-skeleton">
      <span className="inline-block h-4 w-12 rounded bg-muted" />
      <span className="inline-block h-9 w-36 rounded-lg bg-muted" />
    </div>
  );
}
