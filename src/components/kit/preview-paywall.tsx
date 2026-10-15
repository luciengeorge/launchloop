import { BriefcaseBusiness, Check, FileArchive, Image as ImageIcon, ListChecks, Lock, MessageSquareText, PanelsTopLeft, Rocket } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { IMAGE_VARIANTS } from "@/lib/image-variants";
import { LIMITS } from "@/lib/limits";
import { PRODUCTS } from "@/lib/products";
import { UnlockPanel } from "./unlock-panel";

interface Props {
  kitId: string;
  productName: string;
  /** Section sizes, from the speculative draft when it's done, else the template shape. */
  counts: { features: number; xPosts: number; checklistSteps: number };
  /** One real, free piece of the kit, shown readable as a sample. */
  sample?: { title: string; text: string };
  email?: string;
  query: Record<string, string | string[] | undefined>;
}

const fmt = (n: number) => n.toLocaleString("en-GB");

/** Shown on an unpaid kit once the free preview is done: what £19 unlocks, one real sample, and the single unlock CTA. */
export function PreviewPaywall({ kitId, productName, counts, sample, email, query }: Props) {
  const imageCount = Object.keys(IMAGE_VARIANTS).length;
  const sections = [
    { icon: PanelsTopLeft, title: "Landing page copy", detail: `Headline, subheadline, button text, ${counts.features} feature blocks, meta title and description.` },
    { icon: Rocket, title: "Product Hunt post", detail: `Name, a ${LIMITS.phDescription}-character description, topics and the maker comment. Your tagline is already in the free preview.` },
    { icon: MessageSquareText, title: "X launch thread", detail: `${Math.max(counts.xPosts - 1, 1)} more posts after the free one, each under ${LIMITS.xPost} characters the way X counts them.` },
    { icon: BriefcaseBusiness, title: "LinkedIn post", detail: `One launch post, up to ${fmt(LIMITS.linkedin)} characters.` },
    { icon: ImageIcon, title: `${imageCount} social images`, detail: "Link preview, X and LinkedIn card, and a Product Hunt gallery image in your brand colours. No watermark." },
    { icon: ListChecks, title: "Launch-day checklist", detail: `${counts.checklistSteps} steps you tick off in your account as you go.` },
    { icon: FileArchive, title: "ZIP and email copy", detail: "Everything in one download, plus a copy in your inbox." },
  ];

  return (
    <section
      className="grid overflow-hidden rounded-2xl border-2 border-primary bg-card shadow-xl shadow-primary/10 lg:grid-cols-[1fr_380px]"
      aria-labelledby="paywall-heading"
      data-testid="preview-paywall"
    >
      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-primary">
            <Check className="size-3.5" aria-hidden="true" /> Free preview done
          </p>
          <h2 id="paywall-heading" className="mt-2 text-2xl font-semibold tracking-tight">
            Like it? Here&apos;s the rest of {productName}&apos;s launch kit.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Written from your repo and live page, checked against every platform limit, ready to paste. {PRODUCTS.kit.priceLabel} once, no subscription.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Locked in the full kit" data-testid="paywall-locked-sections">
          {sections.map(({ icon: Icon, title, detail }) => (
            <li key={title} className="flex gap-3 rounded-xl border border-border bg-background p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {title}
                  <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{detail}</span>
              </span>
            </li>
          ))}
        </ul>

        {sample ? (
          <figure className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-4" data-testid="paywall-sample">
            <figcaption className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium">
                <span className="font-mono uppercase tracking-widest text-primary">Unlocked sample</span>
                <span className="text-muted-foreground"> · {sample.title}</span>
              </span>
              <CopyButton text={sample.text} />
            </figcaption>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{sample.text}</p>
          </figure>
        ) : null}
      </div>

      <div className="border-t border-border bg-muted/40 p-6 sm:p-8 lg:border-l lg:border-t-0">
        <UnlockPanel
          kitId={kitId}
          priceLabel={PRODUCTS.kit.priceLabel}
          email={email}
          autoCheckout={query.unlock === "1"}
          cancelled={query.checkout === "cancelled"}
          saved={query.saved === "1"}
        />
      </div>
    </section>
  );
}
