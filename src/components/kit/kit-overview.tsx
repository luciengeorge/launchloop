import { AlertTriangle, Check, X } from "lucide-react";
import type { Kit } from "@/lib/schema";

function SourceChip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs" data-testid="source-chip" data-ok={ok}>
      {ok ? <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" /> : <X className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <span className={`min-w-0 break-words ${ok ? "" : "text-muted-foreground"}`}>{children}</span>
    </li>
  );
}

export function KitOverview({ kit }: { kit: Kit }) {
  const { brief, source, palette } = kit;
  return (
    // minmax(0, 1fr) and min-w-0: a long unbroken word (a repo path, a commit title) wraps instead of widening the page.
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 space-y-5 break-words rounded-2xl border border-border bg-card p-6" aria-labelledby="brief-heading">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Product brief</p>
          <h2 id="brief-heading" className="mt-1 text-xl font-semibold">{brief.oneLiner}</h2>
        </div>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium">Who it&apos;s for</dt>
            <dd className="mt-1 text-muted-foreground">{brief.audience}</dd>
          </div>
          <div>
            <dt className="font-medium">Problem it solves</dt>
            <dd className="mt-1 text-muted-foreground">{brief.problem}</dd>
          </div>
          <div>
            <dt className="font-medium">Features we found</dt>
            <dd className="mt-1">
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {brief.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="font-medium">Proof points</dt>
            <dd className="mt-1">
              {brief.proofPoints.length ? (
                <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                  {brief.proofPoints.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No numbers found. Add stats to your README for punchier copy.</p>
              )}
            </dd>
          </div>
        </dl>
        {brief.stack.length ? (
          <p className="text-sm">
            <span className="font-medium">Stack:</span> <span className="text-muted-foreground">{brief.stack.join(", ")}</span>
          </p>
        ) : null}
      </section>

      <aside className="min-w-0 space-y-5 break-words rounded-2xl border border-border bg-card p-6" aria-label="What we read">
        <div>
          <h2 className="text-sm font-medium">What we read</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            <SourceChip ok={source.readmeFound}>README</SourceChip>
            <SourceChip ok={source.packageJsonFound}>package.json</SourceChip>
            <SourceChip ok={source.commitsAnalysed > 0}>{source.commitsAnalysed > 0 ? `Last ${source.commitsAnalysed} commits` : "Commits"}</SourceChip>
            <SourceChip ok={source.pageScraped}>Live page</SourceChip>
            {source.stars !== undefined ? <SourceChip ok>{source.stars} stars</SourceChip> : null}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-medium">Brand colours {palette.source === "default" ? "(defaults)" : palette.source === "repo" ? "(from your repo)" : "(from your site)"}</h2>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Palette">
            {[palette.background, palette.accent, palette.foreground, palette.muted].map((c, i) => (
              <li key={`${c}-${i}`} className="flex flex-col items-center gap-1">
                <span className="size-9 rounded-lg border border-border" style={{ backgroundColor: c }} />
                <span className="font-mono text-[10px] text-muted-foreground">{c}</span>
              </li>
            ))}
          </ul>
        </div>
        {source.warnings.length ? (
          <ul className="space-y-2 text-xs text-muted-foreground">
            {source.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                {w}
              </li>
            ))}
          </ul>
        ) : null}
      </aside>
    </div>
  );
}
