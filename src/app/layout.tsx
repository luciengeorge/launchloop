import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LazyToaster } from "@/components/lazy-toaster";
import { VercelInsights } from "@/components/vercel-insights";
import { siteUrl } from "@/lib/env";
import { SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const IMPACT_SITE_VERIFICATION = "0b7b3f21-3941-4494-bcc1-f28c3d5decf1";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["launch kit", "Product Hunt launch", "launch copy", "OG image generator", "vibe coding", "indie hackers", "X thread", "landing page copy"],
  // No canonical, og:url or robots here: every child inherits them, so the 404 and noindex pages would canonicalise to the
  // home page and the 404 would carry a conflicting robots tag. Indexable pages set their own through pageMetadata.
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
    locale: "en_GB",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE.name}: ${SITE.tagline}` }],
  },
  twitter: { card: "summary_large_image", site: SITE.twitter, title: `${SITE.name}: ${SITE.tagline}`, description: SITE.shortDescription, images: ["/opengraph-image"] },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#faf8f5",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Impact matches the `value` attribute, which the Metadata API can't emit (it writes `content`) and React's meta typings omit. */}
        <meta name="impact-site-verification" {...{ value: IMPACT_SITE_VERIFICATION }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <LazyToaster position="bottom-center" />
        <VercelInsights />
      </body>
    </html>
  );
}
