"use client";

import type { ComponentProps } from "react";
import { EXPERIMENTS, type Served } from "@/lib/experiments";
import { HERO_HEADLINE_CONTROL, heroHeadline, splitHeadline } from "@/lib/hero-headline";
import { useRenderedExperiment, useShownExperiment } from "@/lib/use-experiment";
import { cn } from "@/lib/utils";

function Headline({ text, className, ...props }: { text: string } & ComponentProps<"h1">) {
  const [lead, rest] = splitHeadline(text);
  return (
    <h1 className={cn("max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl", className)} {...props}>
      {rest ? (
        <>
          {`${lead} `}
          <span className="text-primary">{rest}</span>
        </>
      ) : (
        lead
      )}
    </h1>
  );
}

/**
 * React reveals a streamed Suspense boundary no sooner than 300 ms after the page's first paint. This runs as soon as
 * the headline arrives instead: it copies the text into the invisible placeholder and shows it, and React's later
 * swap puts an identical h1 in the same box. Inert on the client (inserted scripts don't run anyway).
 */
const SHOW_NOW = `(function(){var p=document.querySelector("[data-hero-pending]"),r=document.querySelectorAll("[data-hero-ready]");r=r[r.length-1];if(p&&r){p.innerHTML=r.innerHTML;p.classList.remove("invisible")}})()`;

/** The home h1 for this view's exp_hero_headline assignment (null: not running, control). */
export function HeroHeadline({ served }: { served: Served | null }) {
  return (
    <>
      <Headline text={heroHeadline(useRenderedExperiment(EXPERIMENTS.heroHeadline, served))} data-hero-ready="" />
      <script type={typeof window === "undefined" ? "text/javascript" : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SHOW_NOW }} />
    </>
  );
}

/**
 * Until the assignment streams in: what this page load already showed, or control held invisible, so the text
 * never swaps and the layout doesn't move. Without JavaScript the stream can't replace it, so it shows control.
 */
export function HeroHeadlinePending() {
  const shown = useShownExperiment(EXPERIMENTS.heroHeadline);
  if (shown !== undefined) return <Headline text={heroHeadline(shown)} />;
  return (
    <>
      <Headline text={HERO_HEADLINE_CONTROL} className="invisible" data-hero-pending="" />
      <noscript>
        <style>{"[data-hero-pending]{visibility:visible}"}</style>
      </noscript>
    </>
  );
}
