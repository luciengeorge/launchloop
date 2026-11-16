import { BuyPackButton } from "@/components/directory-pack/buy-pack-button";
import { WaitlistForm } from "@/components/waitlist-form";

/**
 * The pack's price and Buy button, or, while STRIPE_DIRECTORY_PACK_PRICE_ID is unset (`offer` null, see directoryPackOffer),
 * "Coming soon" and the pack's waitlist with no price at all.
 */
export function PackOffer({ offer, source }: { offer: { priceLabel: string } | null; source: "directory_pack_page" | "free_directories_page" }) {
  return (
    <div data-testid="pack-offer" className="space-y-4 rounded-2xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10">
      {offer ? (
        <>
          <p className="text-3xl font-semibold tracking-tight">
            {offer.priceLabel} <span className="text-base font-normal text-muted-foreground">once, no subscription</span>
          </p>
          <BuyPackButton priceLabel={offer.priceLabel} />
        </>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Coming soon</p>
            <p className="text-sm text-muted-foreground">Join the waitlist and we&apos;ll email you when the pack is ready. It&apos;s free to join.</p>
          </div>
          <div id="waitlist" className="scroll-mt-20">
            <WaitlistForm source={source} />
          </div>
        </>
      )}
    </div>
  );
}
