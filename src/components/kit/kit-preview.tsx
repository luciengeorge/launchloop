import { Lock } from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";
import { LIMITS, charLength, xLength } from "@/lib/limits";
import type { Kit } from "@/lib/schema";
import { KIT_CONTENTS } from "@/lib/site";

export function KitPreview({ kit, cancelled }: { kit: Kit; cancelled: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section aria-labelledby="preview-heading" className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="preview-heading" className="text-lg font-semibold">
              Your free preview
            </h2>
            <span className="text-xs text-muted-foreground">Watermarked · drafted by {kit.llm === "mock" ? "LaunchLoop (mock mode)" : "LaunchLoop"}</span>
          </div>

          <figure className="watermark overflow-hidden rounded-xl border border-border bg-card p-5" data-testid="preview-tagline">
            <figcaption className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Product Hunt tagline</span>
              <span className="font-mono">
                {charLength(kit.preview.tagline)}/{LIMITS.phTagline}
              </span>
            </figcaption>
            <p className="select-none text-xl font-medium">{kit.preview.tagline}</p>
          </figure>

          <figure className="watermark overflow-hidden rounded-xl border border-border bg-card p-5" data-testid="preview-xpost">
            <figcaption className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>X post 1 of your launch thread</span>
              <span className="font-mono">
                {xLength(kit.preview.xPost)}/{LIMITS.xPost}
              </span>
            </figcaption>
            <p className="select-none whitespace-pre-wrap text-sm leading-relaxed">{kit.preview.xPost}</p>
          </figure>

          <figure className="overflow-hidden rounded-xl border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic PNG from our own route; next/image adds nothing here */}
            <img src={`/api/og/${kit.id}/og`} alt={`Watermarked Open Graph image preview for ${kit.brief.name}`} width={1200} height={630} className="h-auto w-full" />
            <figcaption className="px-4 py-2.5 text-xs text-muted-foreground">Open Graph image preview (1200×630). The full kit removes the watermark and adds two more sizes.</figcaption>
          </figure>
        </section>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-2xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10" aria-labelledby="unlock-heading">
          <h2 id="unlock-heading" className="text-lg font-semibold">
            Unlock the full launch kit
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One-off <span className="font-semibold text-foreground">£19</span>. Delivered here, as a ZIP and by email.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {KIT_CONTENTS.map((item) => (
              <li key={item.title} className="flex items-center gap-2">
                <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {item.title}
              </li>
            ))}
          </ul>
          {cancelled ? (
            <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs" role="status">
              Checkout was cancelled. Your preview is saved here whenever you&apos;re ready.
            </p>
          ) : null}
          <CheckoutButton product="kit" kitId={kit.id} className="mt-6 h-11 w-full text-base">
            Unlock full kit for £19
          </CheckoutButton>
          <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout by Stripe · 14-day refund</p>
        </section>
      </aside>
    </div>
  );
}
