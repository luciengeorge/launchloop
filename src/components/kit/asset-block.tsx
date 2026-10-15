import { CopyButton } from "@/components/copy-button";
import { charLength, xLength } from "@/lib/limits";

interface Props {
  label: string;
  text: string;
  limit?: number;
  measure?: "chars" | "x";
  hint?: string;
}

export function AssetBlock({ label, text, limit, measure = "chars", hint }: Props) {
  const length = measure === "x" ? xLength(text) : charLength(text);
  const within = limit === undefined || length <= limit;
  return (
    <section className="rounded-xl border border-border bg-card" aria-label={label}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{label}</h3>
          {limit !== undefined ? (
            <span
              data-testid="char-count"
              data-within={within}
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${within ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}
              title={measure === "x" ? "Counted the way X counts (links = 23)" : "Characters"}
            >
              {length}/{limit}
            </span>
          ) : null}
        </div>
        <CopyButton text={text} />
      </header>
      <p className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed">{text}</p>
      {hint ? <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{hint}</p> : null}
    </section>
  );
}
