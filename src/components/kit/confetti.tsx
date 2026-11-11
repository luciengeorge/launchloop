"use client";

import { useCallback, useEffect, useSyncExternalStore, type CSSProperties } from "react";
import "./confetti.css";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const reducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
const serverReducedMotion = () => true;

/** Claim before checking motion so a skipped celebration cannot replay later in this tab session. */
export function claimChecklistConfetti(kitId: string): boolean {
  try {
    const key = `launchloop:confetti:${kitId}`;
    if (sessionStorage.getItem(key) !== null) return false;
    sessionStorage.setItem(key, "seen");
  } catch {
    // Fail closed if session storage is unavailable: a revisit must not replay the burst.
    return false;
  }
  return !reducedMotion();
}

const PIECES = [
  [-110, -70, -120], [-75, -115, 95], [-40, -90, -80], [0, -125, 110],
  [40, -90, -95], [75, -115, 85], [110, -70, 120], [-95, 25, -100],
  [-50, 55, 90], [0, 70, -80], [50, 55, 100], [95, 25, -110],
];
const COLOURS = ["#f2541b", "#ffb547", "#10b981", "#3b82f6", "#a855f7"];

/** One short CSS burst, with no mounted decoration before or after it or under reduced motion. */
export function Confetti({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  const subscribe = useCallback((notify: () => void) => {
    const media = window.matchMedia(REDUCED_MOTION);
    const change = () => {
      if (media.matches) onComplete();
      notify();
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [onComplete]);
  const reduced = useSyncExternalStore(subscribe, reducedMotion, serverReducedMotion);
  useEffect(() => {
    if (!active || reduced) return;
    // Also expire if route hiding or interrupted CSS prevents animationend from firing.
    const timer = setTimeout(onComplete, 200);
    return () => clearTimeout(timer);
  }, [active, reduced, onComplete]);
  if (!active || reduced) return null;

  return (
    <div aria-hidden="true" data-testid="confetti" className="kit-checklist-confetti" onAnimationEnd={onComplete}>
      {PIECES.map(([x, y, rotation], index) => (
        <i key={index} className="kit-checklist-confetti-piece" style={{
          "--confetti-x": `${x}px`,
          "--confetti-y": `${y}px`,
          "--confetti-rotation": `${rotation}deg`,
          backgroundColor: COLOURS[index % COLOURS.length],
        } as CSSProperties} />
      ))}
    </div>
  );
}
