import Link from "next/link";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";
import { FooterNewsletter } from "./footer-newsletter";
import { Logo } from "./logo";
import { SHIP_LOOP_LINK_LABEL, SoonBadge } from "./soon-badge";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1.2fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{SITE.shortDescription} Built for makers shipping with Cursor, Lovable, Bolt and v0.</p>
          <FooterNewsletter />
        </div>
        <nav aria-label="Product" className="space-y-3 text-sm">
          <h2 className="font-medium">Product</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link href="/#start" className="hover:text-foreground">Get a launch kit</Link></li>
            <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li>
              <Link href="/ship-loop" aria-label={SHIP_LOOP_LINK_LABEL} className="inline-flex items-center gap-1.5 hover:text-foreground">
                Ship Loop
                <SoonBadge />
              </Link>
            </li>
            <li><Link href="/faq" className="hover:text-foreground">FAQ</Link></li>
          </ul>
        </nav>
        <nav aria-label="Free tools and guides" className="space-y-3 text-sm">
          <h2 className="font-medium">Free tools &amp; guides</h2>
          <ul className="space-y-2 text-muted-foreground">
            {TOOLS.map((tool) => (
              <li key={tool.path}><Link href={tool.path} className="hover:text-foreground">{tool.title}</Link></li>
            ))}
            <li><Link href="/product-hunt-launch-checklist" className="hover:text-foreground">Product Hunt launch checklist</Link></li>
            <li><Link href="/how-to-launch-a-vibe-coded-app" className="hover:text-foreground">How to launch a vibe-coded app</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company" className="space-y-3 text-sm">
          <h2 className="font-medium">Company</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href={`mailto:${SITE.email}`} className="hover:text-foreground">{SITE.email}</a></li>
            <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
            <li><a href="/llms.txt" className="hover:text-foreground">llms.txt</a></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border/60">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © 2026 LaunchLoop. Drafts only: we never post on your behalf or ask anyone for upvotes.
        </p>
      </div>
    </footer>
  );
}
