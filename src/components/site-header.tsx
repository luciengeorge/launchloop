import Link from "next/link";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { HeaderAuth } from "./header-auth";
import { OG_PREVIEW, TAGLINE_CHECKER } from "@/lib/tools";
import { Logo } from "./logo";
import { SHIP_LOOP_LINK_LABEL, SoonBadge } from "./soon-badge";

type NavItem = { href: string; label: string; className?: string; ariaLabel?: string; soon?: boolean };

const NAV: NavItem[] = [
  { href: "/#kit", label: "What you get" },
  { href: "/pricing", label: "Pricing" },
  { href: "/ship-loop", label: "Ship Loop", ariaLabel: SHIP_LOOP_LINK_LABEL, soon: true, className: "inline-flex items-center gap-1.5" },
  { href: TAGLINE_CHECKER.path, label: "Tagline checker", className: "hidden lg:inline" },
  { href: OG_PREVIEW.path, label: "OG preview", className: "hidden xl:inline" },
  { href: "/faq", label: "FAQ" },
];

export async function SiteHeader() {
  const promo = await isLaunchPromoOn();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.ariaLabel}
              className={`whitespace-nowrap transition-colors hover:text-foreground ${item.className ?? ""}`}
            >
              {item.label}
              {item.soon ? <SoonBadge /> : null}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          <HeaderAuth promo={promo} />
        </div>
      </div>
    </header>
  );
}
