import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PreviewCta } from "@/components/preview-cta";
import { siteUrl } from "@/lib/env";
import { GUIDES, guidePath, type Guide } from "@/lib/guides";
import { guidePage, PAGES } from "@/lib/pages";
import { SITE } from "@/lib/site";
import { breadcrumbs } from "@/lib/structured-data";

export function GuideLayout({ guide, children }: { guide: Guide; children: React.ReactNode }) {
  const base = siteUrl();
  const page = guidePage(guide);
  const url = `${base}${page.path}`;
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
              image: `${base}${page.image.url}`,
              datePublished: guide.updated,
              dateModified: guide.updated,
              inLanguage: "en-GB",
              author: { "@type": "Organization", name: SITE.name, url: `${base}/` },
              publisher: { "@id": `${base}/#organization`, "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${base}/icons/icon-512.png` } },
            },
            breadcrumbs(base, [
              { name: "Guides", path: PAGES.guides.path },
              { name: guide.title, path: page.path },
            ]),
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span>{" "}
        <Link href={PAGES.guides.path} className="hover:text-foreground">Guides</Link> <span aria-hidden="true">/</span> <span aria-current="page">{guide.title}</span>
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
      <PreviewCta />
      <nav aria-label="More guides" className="mt-10 text-sm">
        <h2 className="font-medium">More guides</h2>
        <ul className="mt-2 space-y-1">
          {others.map((g) => (
            <li key={g.slug}>
              <Link href={guidePath(g)} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">{g.title}</Link>
            </li>
          ))}
          <li><Link href={PAGES.guides.path} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">All launch guides</Link></li>
          <li><Link href={PAGES.tools.path} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">Free launch tools</Link></li>
          <li><Link href="/faq" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">LaunchLoop FAQ</Link></li>
        </ul>
      </nav>
    </article>
  );
}
