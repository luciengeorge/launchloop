"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HN_SOURCES, RULE_BY_ID, checkShowHn, type CheckKind, type CheckStatus, type LinkType, type ShowHnCheck, type Verdict } from "@/lib/show-hn-check";

const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: "project", label: "Something to try (app, site or repo)" },
  { value: "video", label: "A video" },
  { value: "pdf", label: "A PDF" },
];

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "pass":
      return <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Pass" />;
    case "warn":
      return <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="Warning" />;
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

function KindBadge({ kind }: { kind: CheckKind }) {
  switch (kind) {
    case "rule":
      return <span className="rounded-full border border-border px-1.5 py-px text-[0.6875rem] font-medium uppercase tracking-wide text-foreground">HN rule</span>;
    case "tip":
      return <span className="rounded-full bg-muted px-1.5 py-px text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">Our tip</span>;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function verdictText(verdict: Verdict, ruleWarnings: number, tipWarnings: number, empty: boolean): string {
  if (empty) return "Start typing your title. The checks update as you go.";
  switch (verdict) {
    case "pass":
      return "Passes every HN rule and tip this tool checks.";
    case "tips":
      return `Passes every HN rule this tool checks, with ${tipWarnings} tip${tipWarnings === 1 ? "" : "s"} to consider.`;
    case "warn":
      return `${ruleWarnings} HN rule${ruleWarnings === 1 ? "" : "s"} to look at.`;
    default: {
      const unreachable: never = verdict;
      return unreachable;
    }
  }
}

function CheckItem({ check }: { check: ShowHnCheck }) {
  const quote = RULE_BY_ID[check.id].quotes[0];
  return (
    <li data-check={check.id} data-status={check.status} data-kind={check.kind} className="flex gap-2.5 text-sm">
      <StatusIcon status={check.status} />
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{check.label}</span>
          <KindBadge kind={check.kind} />
        </p>
        <p className="text-muted-foreground">{check.detail}</p>
        {quote ? (
          <p className="break-words text-xs text-muted-foreground">
            <q>{quote.text}</q>{" "}
            <a href={HN_SOURCES[quote.source].url} className="font-medium text-foreground underline underline-offset-4">
              {HN_SOURCES[quote.source].name}
            </a>
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function ShowHnChecker() {
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [link, setLink] = useState<LinkType>("project");
  const ids = useId();

  const result = checkShowHn({ title, comment, link });
  const ruleWarnings = result.checks.filter((c) => c.kind === "rule" && c.status === "warn").length;
  const tipWarnings = result.checks.filter((c) => c.kind === "tip" && c.status === "warn").length;
  const empty = result.checks.length === 0;

  return (
    <div className="space-y-6" data-testid="showhn-checker">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${ids}-title`}>Show HN title</Label>
            <span id={`${ids}-count`} data-testid="showhn-count" className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
              {result.titleLength} characters
            </span>
          </div>
          <Input
            id={`${ids}-title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Show HN: Gridcast, turn a CSV into a dashboard"
            autoComplete="off"
            spellCheck
            aria-describedby={`${ids}-count ${ids}-count-note ${ids}-verdict`}
            className="h-11 text-base"
          />
          <p id={`${ids}-count-note`} className="text-xs text-muted-foreground">
            A plain count: HN&apos;s guidelines, Show HN page and FAQ don&apos;t state a title length limit.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What does your link go to?</legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {LINK_TYPES.map((t) => (
              <label key={t.value} className="flex min-h-6 cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name={`${ids}-link`} value={t.value} checked={link === t.value} onChange={() => setLink(t.value)} className="size-4 accent-primary" />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${ids}-comment`}>
              Your text or first comment <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <span className="shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">{result.commentLength} characters</span>
          </div>
          <Textarea
            id={`${ids}-comment`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What it is, why you built it, how it works and how to try it."
            rows={5}
            spellCheck
            aria-describedby={`${ids}-verdict`}
            className="min-h-28 text-base md:text-base"
          />
        </div>
      </div>

      <section aria-labelledby={`${ids}-checks`} className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 id={`${ids}-checks`} className="text-sm font-medium">Checklist</h2>
        <p id={`${ids}-verdict`} data-testid="showhn-verdict" data-verdict={empty ? "empty" : result.verdict} role="status" aria-live="polite" className="mt-1 text-sm text-muted-foreground">
          {verdictText(result.verdict, ruleWarnings, tipWarnings, empty)}
        </p>
        {empty ? null : (
          <ul className="mt-4 space-y-4" data-testid="showhn-checks">
            {result.checks.map((c) => (
              <CheckItem key={c.id} check={c} />
            ))}
          </ul>
        )}
        {!empty && result.verdict !== "warn" ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Next, the <Link href="/show-hn-launch-checklist" className="font-medium text-foreground underline underline-offset-4">Show HN launch checklist</Link> covers what
            a checker can&apos;t: whether it qualifies, getting ready for the traffic and when to post.
          </p>
        ) : null}
      </section>
    </div>
  );
}
