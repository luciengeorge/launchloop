import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { KitForm } from "@/components/kit-form";
import { PricingSection } from "@/components/pricing-section";
import { siteUrl } from "@/lib/env";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { PAGES, pricedPage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, launchLoopApp } from "@/lib/structured-data";

const page = PAGES.pricing;

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(pricedPage(page, await isLaunchPromoOn()));
}

export default async function PricingPage() {
  const base = siteUrl();
  const promo = await isLaunchPromoOn();
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [launchLoopApp(base, promo), breadcrumbs(base, [{ name: "Pricing", path: page.path }])] }} />
      <PricingSection variant="page" promo={promo} />
      <section id="start" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col items-center px-4 py-16 text-center sm:px-6" aria-labelledby="start-heading">
        <h2 id="start-heading" className="text-2xl font-semibold tracking-tight">Start with a free preview</h2>
        <p className="mt-2 text-muted-foreground">Paste a public GitHub repo or your live site. No account needed.</p>
        <div className="mt-6 flex w-full justify-center">
          <KitForm promo={promo} />
        </div>
      </section>
    </>
  );
}
