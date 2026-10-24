import Link from "next/link";
import { GUIDES, guidePath } from "@/lib/guides";
import { PAGES } from "@/lib/pages";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";
import { FooterNewsletter } from "./footer-newsletter";
import { Logo } from "./logo";
import { SHIP_LOOP_LINK_LABEL, SoonBadge } from "./soon-badge";

/**
 * Directory badges, as each directory's embed gives them. Both listings are checked by a bot that loads the home page
 * and looks for a followed link to the directory, so these links must never carry rel="nofollow", "ugc" or "sponsored".
 * width and height are the rendered size, set in CSS too: the images' own aspect ratios aren't whole pixels at these
 * sizes, and with height: auto the box would resize slightly once each one loads.
 */
const FEATURED_ON = [
  {
    href: "https://startupfa.me/s/launchloop-1?utm_source=launchloop.dev",
    src: "https://startupfa.me/badges/featured-badge-small.webp",
    // The embed's own alt, "LaunchLoop - Featured on Startup Fame", wraps to two lines and is cut off in this box if the image fails.
    alt: "Featured on Startup Fame",
    width: 224,
    height: 36,
  },
  { href: "https://twelve.tools", src: "https://twelve.tools/badge0-light.svg", alt: "Featured on Twelve Tools", width: 148, height: 40 },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/40" data-site-footer>
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
            {GUIDES.map((g) => (
              <li key={g.slug}><Link href={guidePath(g)} className="hover:text-foreground">{g.title}</Link></li>
            ))}
            <li><Link href={PAGES.tools.path} className="hover:text-foreground">All free tools</Link></li>
            <li><Link href={PAGES.guides.path} className="hover:text-foreground">All guides</Link></li>
            <li><Link href={PAGES.blog.path} className="hover:text-foreground">Blog</Link></li>
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
      <section aria-labelledby="footer-featured-on" className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-5 sm:px-6">
          <h2 id="footer-featured-on" className="text-xs font-medium text-muted-foreground">Featured on</h2>
          <ul className="flex flex-wrap items-center gap-3">
            {FEATURED_ON.map((badge) => (
              <li key={badge.href}>
                <a href={badge.href} target="_blank" rel="noopener" className="block rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element -- the directory's own badge image, as its embed uses it */}
                  <img src={badge.src} alt={badge.alt} width={badge.width} height={badge.height} loading="lazy" decoding="async" style={{ width: badge.width, height: badge.height }} className="block max-w-none object-contain" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="border-t border-border/60">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © 2026 LaunchLoop. Drafts only: we never post on your behalf or ask anyone for upvotes.
        </p>
      </div>
    </footer>
  );
}
