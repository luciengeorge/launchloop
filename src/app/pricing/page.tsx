import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { KitForm } from "@/components/kit-form";
import { PricingSection } from "@/components/pricing-section";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";

export const metadata: Metadata = pageMetadata({
  title: "Pricing: free preview, £19 Launch Kit, Ship Loop",
  description:
    "LaunchLoop pricing: try a free preview, pay £19 once for a Launch Kit with landing copy, Product Hunt post, X thread, LinkedIn post and images, then add Ship Loop (coming soon, £12/month or £99/year) after launch.",
  path: "/pricing",
});

export default async function PricingPage() {
  const promo = await isLaunchPromoOn();
  return (
    <>
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
