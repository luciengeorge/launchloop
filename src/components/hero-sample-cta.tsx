"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { EXPERIMENTS, type VariantOf } from "@/lib/experiments";
import { EXAMPLE_KIT_PATH } from "@/lib/site";
import { useExperiment } from "@/lib/use-experiment";

type HeroVariant = VariantOf<typeof EXPERIMENTS.heroSampleCta>;

const HeroSampleCta = createContext<HeroVariant>("control");

/**
 * exp_hero_sample_cta, read once per home page view for everything inside the hero. Control until PostHog
 * answers, and for good if it doesn't (no key, flags blocked, slow or off).
 */
export function HeroSampleCtaExperiment({ children }: { children: ReactNode }) {
  const variant = useExperiment(EXPERIMENTS.heroSampleCta, { afterPageLoad: true })?.variant ?? "control";
  return <HeroSampleCta value={variant}>{children}</HeroSampleCta>;
}

/** Control outside the home hero, so the start form elsewhere (/account) is unchanged. */
export const useHeroSampleCta = () => useContext(HeroSampleCta);

/** "Try a sample app": a quiet text link in control, a visible button in test. Same element and name in both. */
export function sampleCtaClassName(variant: HeroVariant): string {
  switch (variant) {
    case "control":
      return "font-medium text-foreground underline underline-offset-4 hover:text-primary";
    case "test":
      return buttonVariants({ variant: "outline", size: "lg", className: "border-primary/40 bg-primary/5 px-3 text-foreground hover:bg-primary/10" });
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
