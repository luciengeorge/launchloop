import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { KitPrice } from "@/components/kit-price";
import { buttonVariants } from "@/components/ui/button";
import { siteUrl } from "@/lib/env";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import type { SitePage } from "@/lib/pages";
import { SITE } from "@/lib/site";
import { breadcrumbs, collectionPage } from "@/lib/structured-data";

type HubItem = { path: string; title: string; description: string; updated?: string };

/** A crawlable index of guides or tools: CollectionPage JSON-LD, breadcrumbs, the main list and links to the sibling hub. */
export async function HubPage({
  page,
  crumb,
  heading,
  intro,
  items,
  related,
}: {
  page: SitePage;
  crumb: string;
  heading: string;
  intro: string;
  items: HubItem[];
  related: { heading: string; hubPath: string; hubLabel: string; items: HubItem[] };
}) {
  const base = siteUrl();
  const promo = await isLaunchPromoOn();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            collectionPage(base, { path: page.path, name: heading, description: page.description }, items.map((item) => ({ name: item.title, path: item.path }))),
            breadcrumbs(base, [{ name: crumb, path: page.path }]),
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">{crumb}</span>
      </nav>
      <header className="mt-4 space-y-3">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-lg text-muted-foreground">{intro}</p>
      </header>

      <ul className="mt-10 space-y-4">
        {items.map((item) => (
          <li key={item.path}>
            <article className="relative rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/60">
              <h2 className="text-xl font-semibold tracking-tight">
                <Link href={item.path} className="after:absolute after:inset-0 hover:text-primary">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 text-muted-foreground">{item.description}</p>
              {item.updated ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Updated <time dateTime={item.updated}>{new Date(item.updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time>
                </p>
              ) : null}
            </article>
          </li>
        ))}
      </ul>

      <section className="mt-14" aria-labelledby="related-heading">
        <h2 id="related-heading" className="text-xl font-semibold tracking-tight">{related.heading}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {related.items.map((item) => (
            <li key={item.path}>
              <Link href={item.path} className="font-medium underline underline-offset-4 hover:text-primary">{item.title}</Link>
              <span className="text-muted-foreground">: {item.description}</span>
            </li>
          ))}
          <li>
            <Link href={related.hubPath} className="font-medium underline underline-offset-4 hover:text-primary">{related.hubLabel}</Link>
          </li>
        </ul>
      </section>

      <aside className="mt-14 flex flex-col items-start gap-4 rounded-3xl bg-foreground px-6 py-10 text-background sm:px-10">
        <h2 className="max-w-xl text-balance text-2xl font-semibold tracking-tight">Want the whole launch drafted for you?</h2>
        <p className="max-w-xl text-background/75">
          Paste your repo and {SITE.name} writes your landing copy, Product Hunt post, X thread and LinkedIn post, plus three images in your brand colours. The preview is
          free; the full kit is <KitPrice promo={promo} />.
        </p>
        <Link href="/#start" className={buttonVariants({ size: "lg", className: "h-11 px-5 text-base" })}>Get my free preview</Link>
      </aside>
    </div>
  );
}
