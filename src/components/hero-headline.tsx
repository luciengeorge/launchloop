"use client";

import { useState, type HTMLAttributes } from "react";
import { EXPERIMENTS, fallbackServed, type Served } from "@/lib/experiments";
import { HERO_FAILSAFE_MS, HERO_HEADLINE_CONTROL, heroHeadline, otherHeroHeadline, splitHeadline } from "@/lib/hero-headline";
import { servedMarker } from "@/lib/served-marker";
import { useRenderedExperiment, useShownExperiment } from "@/lib/use-experiment";
import { cn } from "@/lib/utils";

/**
 * The home h1. The other arm's headline sits in the same grid cell as hidden generated content (not in the text or
 * the accessibility tree), so the box is as tall as the taller headline at every width and both arms lay out the same.
 * `placeholder`: the Suspense fallback, a div with the heading role and the same box, so the page's HTML (which also
 * holds the streamed h1, hidden until React reveals it) has one h1. It's the only level-1 heading assistive tech can
 * see until then: the h1 waits in React's `hidden` container, and the reveal removes the placeholder as it inserts the
 * h1. Don't aria-hide it: without JavaScript it's the page's only heading.
 */
function Headline({ text, placeholder = false, className, ...props }: { text: string; placeholder?: boolean } & HTMLAttributes<HTMLElement>) {
  const [lead, rest] = splitHeadline(text);
  const Tag = placeholder ? "div" : "h1";
  return (
    <Tag
      {...(placeholder ? { role: "heading", "aria-level": 1 } : {})}
      className={cn(
        "grid max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl after:invisible after:[grid-area:1/1] after:content-[attr(data-reserve)]",
        className,
      )}
      data-reserve={otherHeroHeadline(text)}
      {...props}
    >
      <span className="[grid-area:1/1]">
        {rest ? (
          <>
            {`${lead} `}
            <span className="text-primary">{rest}</span>
          </>
        ) : (
          lead
        )}
      </span>
    </Tag>
  );
}

/** Hidden until the headline streams in; past HERO_FAILSAFE_MS it shows the control it holds, so a stalled render can't leave it blank. */
const PENDING_CSS = `[data-hero-pending]{visibility:hidden;animation:hero-failsafe 0s ${HERO_FAILSAFE_MS}ms forwards}@keyframes hero-failsafe{to{visibility:visible}}`;

/**
 * React reveals a streamed Suspense boundary no sooner than 300 ms after the page's first paint. This runs as soon as
 * the headline arrives instead: it puts it in the placeholder's box and shows it, and React's later swap puts the h1,
 * identical but for its tag, there. If the failsafe already showed control, control stays: the streamed h1 is rewritten to it and
 * marked, and HeroHeadline records the view as a timeout fallback. Inert on the client (inserted scripts don't run).
 */
const SHOW_NOW = `(function(){var p=document.querySelector("[data-hero-pending]"),r=document.querySelectorAll("[data-hero-ready]");r=r[r.length-1];if(!p||!r)return;if(getComputedStyle(p).visibility==="visible"){r.innerHTML=p.innerHTML;r.setAttribute("data-reserve",p.getAttribute("data-reserve"));r.setAttribute("data-hero-failsafe","");if(r.hasAttribute("data-variant")){r.setAttribute("data-variant","control");r.setAttribute("data-fallback","timeout")}}else{p.innerHTML=r.innerHTML;p.setAttribute("data-reserve",r.getAttribute("data-reserve"));p.removeAttribute("data-hero-pending")}})()`;

/** Whether the failsafe showed control before this view's headline arrived: on a full load SHOW_NOW marks it, on a client-side one the placeholder is still up and showing. */
function failsafeShown(): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector("[data-hero-failsafe]")) return true;
  const pending = document.querySelector("[data-hero-pending]");
  return !!pending && getComputedStyle(pending).visibility === "visible";
}

/** The home h1 for this view's exp_hero_headline assignment (null: not running, control). */
export function HeroHeadline({ served }: { served: Served | null }) {
  const [rescued] = useState(failsafeShown);
  const shown = useRenderedExperiment(EXPERIMENTS.heroHeadline, rescued ? fallbackServed("timeout") : served);
  return (
    <>
      <Headline text={heroHeadline(shown)} data-hero-ready="" {...servedMarker(EXPERIMENTS.heroHeadline, shown)} suppressHydrationWarning />
      <script type={typeof window === "undefined" ? "text/javascript" : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SHOW_NOW }} />
    </>
  );
}

/**
 * Until the assignment streams in: what this page load already showed, or control held invisible in the same box,
 * so the text never swaps and nothing moves. Without JavaScript the stream can't replace it, so it shows control.
 */
export function HeroHeadlinePending() {
  const shown = useShownExperiment(EXPERIMENTS.heroHeadline);
  if (shown !== undefined) return <Headline text={heroHeadline(shown)} placeholder />;
  return (
    <>
      <style>{PENDING_CSS}</style>
      <Headline text={HERO_HEADLINE_CONTROL} placeholder data-hero-pending="" data-experiment-pending={EXPERIMENTS.heroHeadline} />
      <noscript>
        <style>{"[data-hero-pending]{visibility:visible;animation:none}"}</style>
      </noscript>
    </>
  );
}
