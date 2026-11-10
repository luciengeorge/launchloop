"use client";

import { useCallback, useState, type ReactNode } from "react";

// Tailwind only generates class names it can see whole, so each min width is spelled out with its matching hint breakpoint.
const WIDTHS = {
  default: { table: "min-w-[40rem]", hint: "@min-[40rem]:hidden" },
  wide: { table: "min-w-[64rem]", hint: "@min-[64rem]:hidden" },
} as const;

// Box-shadow rings are dropped in forced-colors mode; the transparent outline is repainted in a system color, so focus stays visible there.
export function ScrollTable({
  label,
  caption,
  hintTestId,
  width = "default",
  children,
}: {
  label: string;
  caption: string;
  hintTestId: string;
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  const w = WIDTHS[width];
  const [scrolled, setScrolled] = useState(false);
  // It can be scrolled before React hydrates it, so the position is read when it mounts as well as on scroll.
  const readScroll = useCallback((el: HTMLDivElement | null) => {
    if (el) setScrolled(el.scrollLeft > 0);
  }, []);
  return (
    <div className="@container">
      {/* The hint only shows while the table is wider than its column and scrolled to its start. Invisible, not removed, so the table doesn't move. */}
      <p className={`mb-2 text-xs ${w.hint} ${scrolled ? "invisible" : ""}`} aria-hidden="true" data-testid={hintTestId}>
        Scroll sideways to see all columns →
      </p>
      <div
        className="overflow-x-auto rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-transparent focus-visible:ring-3 focus-visible:ring-ring/50"
        tabIndex={0}
        role="region"
        aria-label={label}
        ref={readScroll}
        onScroll={(e) => readScroll(e.currentTarget)}
      >
        <table className={`w-full ${w.table} text-left text-sm text-muted-foreground`}>
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </div>
  );
}
