import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PricedText } from "@/components/kit-price";
import { siteUrl } from "@/lib/env";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { FAQ, kitPriceText } from "@/lib/site";
import { breadcrumbs, faqPage } from "@/lib/structured-data";

const page = PAGES.faq;

export const metadata: Metadata = pageMetadata(page);

const slug = (q: string) => kitPriceText(q).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** JSON-LD states the list price: the promo is applied at checkout, not part of the offer. */
const PLAIN_FAQ = FAQ.map((item) => ({ q: kitPriceText(item.q), a: kitPriceText(item.a) }));

export default async function FaqPage() {
  const base = siteUrl();
  const promo = await isLaunchPromoOn();
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [faqPage(`${base}${page.path}#faq`, PLAIN_FAQ), breadcrumbs(base, [{ name: "FAQ", path: page.path }])] }} />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Frequently asked questions</h1>
        <p className="text-muted-foreground">
          Can&apos;t find your answer? Email{" "}
          <a href="mailto:hello@launchloop.dev" className="underline underline-offset-4">
            hello@launchloop.dev
          </a>
          .
        </p>
      </header>
      <nav aria-label="Questions" className="mt-8 rounded-xl border border-border bg-card p-5">
        <ul className="space-y-1.5 text-sm">
          {FAQ.map((item) => (
            <li key={item.q}>
              <a href={`#${slug(item.q)}`} className="text-muted-foreground hover:text-foreground">
                <PricedText text={item.q} promo={promo} />
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-10 space-y-10">
        {FAQ.map((item) => (
          <section key={item.q} id={slug(item.q)} className="scroll-mt-20">
            <h2 className="text-xl font-semibold">
              <PricedText text={item.q} promo={promo} />
            </h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              <PricedText text={item.a} promo={promo} />
            </p>
          </section>
        ))}
      </div>
      <p className="mt-12">
        <Link href="/#start" className="font-medium text-primary underline underline-offset-4">
          Get your free preview
        </Link>
      </p>
    </article>
  );
}
