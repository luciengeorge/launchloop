import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MockCheckoutForm } from "@/components/mock-checkout-form";
import { Skeleton } from "@/components/ui/skeleton";
import { deployEnv } from "@/lib/deploy-env";
import { isStripeMock } from "@/lib/env";
import { getKit } from "@/lib/kits";
import { LAUNCH_PROMO, PRODUCTS, chargedPence, isProductId } from "@/lib/products";

export const metadata: Metadata = { title: "Test checkout", robots: { index: false, follow: false } };

export default function MockCheckoutPage({ searchParams }: PageProps<"/checkout/mock">) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <MockCheckout searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MockCheckout({ searchParams }: Pick<PageProps<"/checkout/mock">, "searchParams">) {
  const query = await searchParams;
  const product = typeof query.product === "string" ? query.product : "";
  if (deployEnv() === "production" || !isStripeMock() || !isProductId(product)) notFound();

  const kitId = typeof query.kitId === "string" ? query.kitId : undefined;
  const kit = product === "kit" && kitId ? await getKit(kitId) : null;
  if (product === "kit" && !kit) notFound();
  const item = PRODUCTS[product];
  const promo = product === "kit" && query.promo === LAUNCH_PROMO.code;
  const charged = `£${chargedPence(product, promo) / 100}`;

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800" role="note">
        Test mode: Stripe isn&apos;t configured, so no real payment is taken. Set STRIPE_SECRET_KEY to use Stripe Checkout.
      </p>
      <div>
        <h1 className="text-xl font-semibold">{item.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{kit ? `For ${kit.brief.name}. ` : ""}{item.description}</p>
        <p className="mt-4 text-3xl font-semibold">
          {promo ? <s className="mr-2 text-xl font-normal text-muted-foreground">£{(item.amountPence / 100).toFixed(2)}</s> : null}£{(chargedPence(product, promo) / 100).toFixed(2)}
        </p>
        {promo ? (
          <p className="mt-1 text-sm text-muted-foreground" data-testid="mock-promo">
            {LAUNCH_PROMO.code} applied
          </p>
        ) : null}
      </div>
      <MockCheckoutForm
        product={product}
        kitId={kit?.id}
        priceLabel={charged}
        promo={promo ? LAUNCH_PROMO.code : undefined}
        defaultEmail={typeof query.email === "string" ? query.email : undefined}
        analyticsId={typeof query.aid === "string" ? query.aid : undefined}
      />
    </div>
  );
}
