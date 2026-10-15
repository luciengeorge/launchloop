import Link from "next/link";
import { Suspense } from "react";
import { AccountNav, LogInLink } from "./account-link";
import { AuthCta } from "./auth-cta";
import { Logo } from "./logo";

const NAV = [
  { href: "/#kit", label: "What you get" },
  { href: "/pricing", label: "Pricing" },
  { href: "/ship-loop", label: "Ship Loop" },
  { href: "/faq", label: "FAQ" },
];

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
        <div className="flex items-center gap-3 sm:gap-4">
          <Suspense fallback={<LogInLink />}>
            <AccountNav />
          </Suspense>
          <Suspense fallback={null}>
            <AuthCta />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
