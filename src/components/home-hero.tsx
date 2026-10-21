"use client";

import { cn } from "cn";
import Link from "next/link";
import { createContext, useContext, useRef, type ComponentProps, type MouseEvent } from "react";
import { buttonVariants } from "@/components/ui/button";
import { type ClientEvents, track } from "@/lib/analytics";
import { EXPERIMENTS, type Variant } from "@/lib/experiments";
import { EXAMPLE_KIT_PATH } from "@/lib/site";
import { useExperiment } from "@/lib/use-experiment";

type HeroVariant = Variant<typeof EXPERIMENTS.heroSampleCta>;

/** The hero's variant, or null outside the home hero (the start form on /account keeps its own layout). */
const HeroSampleCta = createContext<HeroVariant | null>(null);

type Clickable = HTMLAnchorElement | HTMLButtonElement | HTMLInputElement;

const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);

/** What was clicked, by its visible text or (for the URL field) its label. Never an input's value. */
function describe(el: Clickable): ClientEvents["hero_clicked"] {
  if (el instanceof HTMLInputElement) return { element: "input", label: el.labels?.[0] ? text(el.labels[0]) : (el.getAttribute("aria-label") ?? el.name) };
  if (el instanceof HTMLAnchorElement) return { element: "a", label: text(el), link_url: el.href };
  return { element: "button", label: text(el) };
}

/**
 * The home page hero. Clicks on its links, buttons and URL field are recorded as hero_clicked (nothing else on the
 * site is click-tracked), and exp_hero_sample_cta is read once per view for everything inside it: control until
 * PostHog answers, and for good if it doesn't (no key, flag missing, flags blocked or slow) or if the visitor
 * presses or types anything in the hero first.
 */
export function HomeHero(props: ComponentProps<"section">) {
  const ref = useRef<HTMLElement>(null);
  const variant = useExperiment(EXPERIMENTS.heroSampleCta, { afterPageLoad: true, freezeOnInteraction: ref })?.variant ?? "control";
  const onClickCapture = (e: MouseEvent<HTMLElement>) => {
    const el = (e.target as Element).closest<Clickable>("a, button, input");
    if (el && e.currentTarget.contains(el)) track("hero_clicked", describe(el));
  };
  return (
    <HeroSampleCta value={variant}>
      <section {...props} ref={ref} onClickCapture={onClickCapture} />
    </HeroSampleCta>
  );
}

export const useHeroSampleCta = () => useContext(HeroSampleCta);

/** Primary orange darkened toward the text colour: 4.5:1 or better on the page background (WCAG AA), hovered too. */
const PRIMARY_TEXT = "text-[color-mix(in_oklch,var(--primary),var(--foreground)_25%)] hover:text-[color-mix(in_oklch,var(--primary),var(--foreground)_25%)]";

/** Centred on phones, so both arms need the same width there too, or the CTA's own edge would move. */
const PHONE_BOX = "max-sm:w-40 max-sm:justify-center";

/**
 * The start form's "Free preview · … · Try a sample app" row. In the hero, both arms take the same space, so the
 * variant appearing moves nothing: the sample CTA is a 44px box (a text link in control, a button in test) on
 * its own centred line on phones.
 */
export function sampleCtaLayout(variant: HeroVariant | null): { row: string; separator: string; button: string } {
  const row = "flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground";
  if (variant === null) {
    return { row, separator: "hidden sm:inline", button: "font-medium text-foreground underline underline-offset-4 hover:text-primary" };
  }
  const hero = { row: `${row} max-sm:justify-center`, separator: "h-0 basis-full overflow-hidden sm:h-auto sm:basis-auto" };
  switch (variant) {
    case "control":
      return { ...hero, button: `inline-flex h-11 items-center ${PHONE_BOX} font-medium text-foreground underline underline-offset-4 hover:text-primary` };
    case "test":
      return {
        ...hero,
        button: cn(buttonVariants({ variant: "outline" }), "h-11 border-primary bg-background px-4 text-sm font-semibold shadow-sm hover:bg-primary/10", PHONE_BOX, PRIMARY_TEXT),
      };
    default: {
      const unhandled: never = variant;
      return unhandled;
    }
  }
}

/** The line under the start form, the same height in both arms: "See an example kit" in test, empty in control. */
export function ExampleKitSlot() {
  const variant = useHeroSampleCta();
  return (
    <div className="mt-1 flex h-11 w-full max-w-2xl items-center justify-center sm:justify-start" data-testid="example-kit-slot">
      {variant === "test" ? (
        <Link href={EXAMPLE_KIT_PATH} className="inline-flex h-11 items-center text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary" data-testid="example-kit-link">
          See an example kit
        </Link>
      ) : null}
    </div>
  );
}
