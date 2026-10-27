import Link from "next/link";
import { KitPrice } from "@/components/kit-price";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { SITE } from "@/lib/site";

/** The free-preview call to action at the end of every guide and blog post. */
export async function PreviewCta() {
  const promo = await isLaunchPromoOn();
  return (
    <aside className="mt-14 rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Skip the blank page</h2>
      <p className="mt-2 text-muted-foreground">
        Paste your GitHub repo or live URL and {SITE.name} drafts your landing copy, Product Hunt post, X thread, LinkedIn post and launch images, all inside each platform&apos;s limits.
        The preview is free; the full kit is <KitPrice promo={promo} />.
      </p>
      <Link href="/#start" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
        Get a free preview
      </Link>
    </aside>
  );
}
