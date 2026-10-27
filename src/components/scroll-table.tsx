import type { ReactNode } from "react";

// Box-shadow rings are dropped in forced-colors mode; the transparent outline is repainted in a system color, so focus stays visible there.
export function ScrollTable({ label, caption, hintTestId, children }: { label: string; caption: string; hintTestId: string; children: ReactNode }) {
  return (
    <div className="@container">
      {/* The table's min width is 40rem, so the hint only shows while the table is wider than its column. */}
      <p className="mb-2 text-xs @min-[40rem]:hidden" aria-hidden="true" data-testid={hintTestId}>
        Scroll sideways to see all columns →
      </p>
      <div
        className="overflow-x-auto rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-transparent focus-visible:ring-3 focus-visible:ring-ring/50"
        tabIndex={0}
        role="region"
        aria-label={label}
      >
        <table className="w-full min-w-[40rem] text-left text-sm text-muted-foreground">
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </div>
  );
}
