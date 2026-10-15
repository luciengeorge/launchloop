import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { KitForm } from "@/components/kit-form";
import { PricingSection } from "@/components/pricing-section";

export const metadata: Metadata = pageMetadata({
  title: "Pricing: free preview, £19 Launch Kit, Ship Loop",
  description: "LaunchLoop pricing: a free preview, a £19 one-off Launch Kit with landing copy, Product Hunt post, X thread, LinkedIn post and images, and Ship Loop at £12/month or £99/year.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <PricingSection headingLevel="h1" />
      <section id="start" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col items-center px-4 py-16 text-center sm:px-6" aria-labelledby="start-heading">
        <h2 id="start-heading" className="text-2xl font-semibold tracking-tight">Start with a free preview</h2>
        <p className="mt-2 text-muted-foreground">Paste your GitHub repo or live site.</p>
        <div className="mt-6 flex w-full justify-center">
          <KitForm />
        </div>
      </section>
    </>
  );
}
