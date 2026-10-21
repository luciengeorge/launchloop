import Link from "next/link";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { PAGES } from "@/lib/pages";
import { HeaderAuth } from "./header-auth";
import { OG_PREVIEW, TAGLINE_CHECKER } from "@/lib/tools";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { SHIP_LOOP_LINK_LABEL, SoonBadge } from "./soon-badge";

/** `className` only applies to the desktop nav: the mobile menu lists every item. */
type NavItem = { href: string; label: string; className?: string; ariaLabel?: string; soon?: boolean };

const NAV: NavItem[] = [
  { href: "/#kit", label: "What you get" },
  { href: "/pricing", label: "Pricing" },
  { href: "/ship-loop", label: "Ship Loop", ariaLabel: SHIP_LOOP_LINK_LABEL, soon: true, className: "inline-flex items-center gap-1.5" },
  { href: TAGLINE_CHECKER.path, label: "Tagline checker", className: "hidden lg:inline" },
  { href: OG_PREVIEW.path, label: "OG preview", className: "hidden xl:inline" },
  { href: PAGES.blog.path, label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

export async function SiteHeader() {
  const promo = await isLaunchPromoOn();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Logo compact />
        {/* gap-3 from md to lg: the 768px row only fits every link beside "Log in" and the CTA with the tighter gap. */}
        <nav aria-label="Main" className="hidden items-center gap-3 text-sm text-muted-foreground md:flex lg:gap-6">
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
        <div className="flex items-center gap-2.5 sm:gap-4">
          <HeaderAuth promo={promo} />
          <MobileMenu>
            <ul className="mx-auto max-w-6xl px-4 py-2 text-sm text-muted-foreground sm:px-6">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-label={item.ariaLabel} className="flex h-11 items-center gap-1.5 whitespace-nowrap transition-colors hover:text-foreground">
                    {item.label}
                    {item.soon ? <SoonBadge /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
