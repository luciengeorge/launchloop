import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { KitForm } from "@/components/kit-form";
import { PricingSection } from "@/components/pricing-section";
import { siteUrl } from "@/lib/env";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, launchLoopApp } from "@/lib/structured-data";

const page = PAGES.pricing;

export const metadata: Metadata = pageMetadata(page);

export default function PricingPage() {
  const base = siteUrl();
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [launchLoopApp(base), breadcrumbs(base, [{ name: "Pricing", path: page.path }])] }} />
      <PricingSection variant="page" />
      <section id="start" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col items-center px-4 py-16 text-center sm:px-6" aria-labelledby="start-heading">
        <h2 id="start-heading" className="text-2xl font-semibold tracking-tight">Start with a free preview</h2>
        <p className="mt-2 text-muted-foreground">Paste a public GitHub repo or your live site. No account needed.</p>
        <div className="mt-6 flex w-full justify-center">
          <KitForm />
        </div>
      </section>
    </>
  );
}
