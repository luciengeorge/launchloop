import { Gift } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { LIMITS } from "@/lib/limits";

/** The free preview's payoff, shown first on an unpaid kit: the real Product Hunt tagline, readable and ready to paste. */
export function FreeTagline({ tagline }: { tagline: string }) {
  const length = [...tagline].length;
  return (
    <section
      className="rounded-2xl border-2 border-primary bg-primary/[0.04] p-5 shadow-lg shadow-primary/10 sm:p-6"
      aria-labelledby="free-tagline-heading"
      data-testid="free-tagline"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="free-tagline-heading" className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
          <Gift className="size-4" aria-hidden="true" />
          Your Product Hunt tagline · free
        </h2>
        <CopyButton text={tagline} label="Copy tagline" />
      </div>
      <p className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="free-tagline-text">
        {tagline}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        {length}/{LIMITS.phTagline} characters, within Product Hunt&apos;s limit. Paste it into your launch as is: it&apos;s yours whether or not you buy the kit.
      </p>
    </section>
  );
}
