"use client";

import { cn } from "cn";
import Link from "next/link";
import { createContext, useContext, type ComponentProps, type MouseEvent } from "react";
import { buttonVariants } from "@/components/ui/button";
import { type ClientEvents, track } from "@/lib/analytics";
import { EXPERIMENTS, type VariantOf } from "@/lib/experiments";
import { EXAMPLE_KIT_PATH } from "@/lib/site";
import { useExperiment } from "@/lib/use-experiment";

type HeroVariant = VariantOf<typeof EXPERIMENTS.heroSampleCta>;

const HeroSampleCta = createContext<HeroVariant>("control");

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
 * PostHog answers, and for good if it doesn't (no key, flag missing, flags blocked or slow).
 */
export function HomeHero(props: ComponentProps<"section">) {
  const variant = useExperiment(EXPERIMENTS.heroSampleCta, { afterPageLoad: true })?.variant ?? "control";
  const onClickCapture = (e: MouseEvent<HTMLElement>) => {
    const el = (e.target as Element).closest<Clickable>("a, button, input");
    if (el && e.currentTarget.contains(el)) track("hero_clicked", describe(el));
  };
  return (
    <HeroSampleCta value={variant}>
      <section {...props} onClickCapture={onClickCapture} />
    </HeroSampleCta>
  );
}

/** Control outside the home hero, so the start form elsewhere (/account) is unchanged. */
export const useHeroSampleCta = () => useContext(HeroSampleCta);

/** "Try a sample app": a quiet text link in control, a visible button in test. Same element and name in both. */
export function sampleCtaClassName(variant: HeroVariant): string {
  switch (variant) {
    case "control":
      return "font-medium text-foreground underline underline-offset-4 hover:text-primary";
    case "test":
      return cn(buttonVariants({ variant: "outline", size: "lg" }), "border-primary/60 bg-background px-3.5 font-semibold text-primary shadow-sm hover:bg-primary/10 hover:text-primary");
    default: {
      const unhandled: never = variant;
      return unhandled;
    }
  }
}

/** Test only: a real kit (the sample app's) to look at, for visitors with no link to paste. */
export function ExampleKitLink({ className }: { className?: string }) {
  if (useHeroSampleCta() !== "test") return null;
  return (
    <Link href={EXAMPLE_KIT_PATH} className={className} data-testid="example-kit-link">
      See an example kit
    </Link>
  );
}
