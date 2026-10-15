import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/env";
import { GUIDES, type Guide } from "@/lib/guides";
import { SITE } from "@/lib/site";
import { breadcrumbs } from "@/lib/structured-data";

export function GuideLayout({ guide, children }: { guide: Guide; children: React.ReactNode }) {
  const base = siteUrl();
  const url = `${base}/${guide.slug}`;
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${url}#article`,
              headline: guide.title,
              description: guide.description,
              url,
              mainEntityOfPage: url,
              image: `${base}/opengraph-image`,
              datePublished: guide.updated,
              dateModified: guide.updated,
              inLanguage: "en-GB",
              author: { "@type": "Organization", name: SITE.name, url: `${base}/` },
              publisher: { "@id": `${base}/#organization`, "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${base}/icons/icon-512.png` } },
            },
            breadcrumbs(base, [{ name: guide.title, path: `/${guide.slug}` }]),
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span> <span>Guides</span>
      </nav>
      <header className="mt-4 space-y-3">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">{guide.title}</h1>
        <p className="text-lg text-muted-foreground">{guide.description}</p>
        <p className="text-xs text-muted-foreground">
          Updated <time dateTime={guide.updated}>{new Date(guide.updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time>
        </p>
      </header>
      <div className="mt-10 space-y-5 leading-relaxed [&_h2]:mt-10 [&_h2]:scroll-mt-20 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:text-muted-foreground [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
      <aside className="mt-14 rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Skip the blank page</h2>
        <p className="mt-2 text-muted-foreground">
          Paste your GitHub repo or live URL and {SITE.name} drafts your landing copy, Product Hunt post, X thread, LinkedIn post and launch images, all inside each platform&apos;s limits.
          The preview is free; the full kit is £19.
        </p>
        <Link href="/#start" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Get a free preview
        </Link>
      </aside>
      {others.length > 0 && (
        <nav aria-label="More guides" className="mt-10 text-sm">
          <h2 className="font-medium">More guides</h2>
          <ul className="mt-2 space-y-1">
            {others.map((g) => (
              <li key={g.slug}>
                <Link href={`/${g.slug}`} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">{g.title}</Link>
              </li>
            ))}
            <li><Link href="/faq" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">LaunchLoop FAQ</Link></li>
          </ul>
        </nav>
      )}
    </article>
  );
}
