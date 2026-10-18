"use client";

import { ArrowRight, CircleCheck, CircleX, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { charLength } from "@/lib/limits";
import { TAGLINE_LIMIT, checkTagline, type CheckStatus } from "@/lib/tagline-check";

type Mode = "check" | "generate";

interface GenerateError {
  message: string;
  fix?: string;
  code: string;
}

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "pass":
      return <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Pass" />;
    case "warn":
      return <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="Warning" />;
    case "fail":
      return <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Fail" />;
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

function verdictText(status: CheckStatus, warnings: number): string {
  switch (status) {
    case "pass":
      return "Ready to paste into Product Hunt.";
    case "warn":
      return `Fits the limit, with ${warnings} thing${warnings === 1 ? "" : "s"} worth fixing.`;
    case "fail":
      return "Not ready yet. Fix the items marked in red.";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

function Counter({ length, id }: { length: number; id?: string }) {
  const within = length <= TAGLINE_LIMIT;
  return (
    <span
      id={id}
      data-testid="tagline-count"
      data-within={within}
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-xs tabular-nums ${within ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}
    >
      {length} / {TAGLINE_LIMIT}
    </span>
  );
}

export function TaglineChecker() {
  const [mode, setMode] = useState<Mode>("check");
  const [tagline, setTagline] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [usedSource, setUsedSource] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GenerateError | null>(null);
  const taglineRef = useRef<HTMLTextAreaElement>(null);
  const ids = useId();

  const result = checkTagline(tagline, name);
  const warnings = result.checks.filter((c) => c.status === "warn").length;
  const hasTagline = result.length > 0;

  async function generate(value: string) {
    setError(null);
    setLoading(true);
    setOptions([]);
    try {
      const res = await fetch("/api/tools/taglines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: value }) });
      const data = (await res.json().catch(() => ({}))) as { name?: string; taglines?: string[]; error?: string; code?: string; fix?: string };
      if (!res.ok || !data.taglines?.length) {
        setError({ message: data.error ?? "Something went wrong reading your app.", fix: data.fix ?? "Try again in a moment.", code: data.code ?? "unknown" });
        return;
      }
      setOptions(data.taglines);
      setUsedSource(value.trim());
      if (data.name && data.name !== "Your app") setName(data.name);
    } catch {
      setError({ message: "We couldn't reach LaunchLoop.", fix: "Check your connection and try again.", code: "network" });
    } finally {
      setLoading(false);
    }
  }

  function pickOption(option: string) {
    setTagline(option);
    setMode("check");
    requestAnimationFrame(() => taglineRef.current?.focus());
  }

  const startHref = usedSource ? `/?url=${encodeURIComponent(usedSource)}#start` : "/#start";
  const showCta = mode === "check" ? hasTagline : options.length > 0;

  return (
    <div className="space-y-6" data-testid="tagline-checker">
      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as Mode);
          setError(null);
        }}
      >
        <TabsList className="h-10! w-full sm:w-fit">
          <TabsTrigger value="check" className="whitespace-nowrap px-4">Check a tagline</TabsTrigger>
          {/* The short label keeps both tabs on one line on narrow phones; the accessible name stays the same. */}
          <TabsTrigger value="generate" className="whitespace-nowrap px-4" aria-label="Generate from repo or URL">
            <span className="sm:hidden">Generate</span>
            <span className="hidden sm:inline">Generate from repo or URL</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="check" className="mt-5 space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${ids}-name`}>Product name <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id={`${ids}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. LaunchLoop" autoComplete="off" className="h-11 text-base" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`${ids}-tagline`}>Tagline</Label>
                <Counter id={`${ids}-count`} length={result.length} />
              </div>
              <Textarea
                id={`${ids}-tagline`}
                ref={taglineRef}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Turn your GitHub repo into a launch kit"
                rows={2}
                spellCheck
                aria-describedby={`${ids}-count ${ids}-verdict`}
                aria-invalid={result.length > TAGLINE_LIMIT || undefined}
                className="min-h-20 text-base md:text-base"
              />
            </div>
          </div>

          {hasTagline ? (
            <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
              <section aria-labelledby={`${ids}-checks`} className="rounded-xl border border-border bg-card p-5">
                <h2 id={`${ids}-checks`} className="text-sm font-medium">Checklist</h2>
                <p id={`${ids}-verdict`} data-testid="tagline-verdict" data-verdict={result.verdict} aria-live="polite" className="mt-1 text-sm text-muted-foreground">
                  {verdictText(result.verdict, warnings)}
                </p>
                <ul className="mt-4 space-y-3" data-testid="tagline-checks">
                  {result.checks.map((c) => (
                    <li key={c.id} data-check={c.id} data-status={c.status} className="flex gap-2.5 text-sm">
                      <StatusIcon status={c.status} />
                      <div>
                        <p className="font-medium">{c.label}</p>
                        <p className="text-muted-foreground">{c.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby={`${ids}-preview`} className="space-y-2">
                <h2 id={`${ids}-preview`} className="text-sm font-medium">Feed preview</h2>
                <div className="flex gap-3 rounded-xl border border-border bg-background p-4" data-testid="tagline-preview">
                  <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">
                    {(name.trim()[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{name.trim() || "Your product"}</p>
                    <p className="break-words text-sm text-muted-foreground">{tagline.trim()}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">How your name and tagline sit together in the Product Hunt feed.</p>
              </section>
            </div>
          ) : (
            <p id={`${ids}-verdict`} className="text-sm text-muted-foreground">
              Start typing. The count and checklist update as you go. Add your product name to check you aren&apos;t repeating it.
            </p>
          )}
        </TabsContent>

        <TabsContent value="generate" className="mt-4 space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void generate(source);
            }}
            className="space-y-2"
            aria-label="Generate taglines from your app"
          >
            <Label htmlFor={`${ids}-source`}>GitHub repo or live site URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`${ids}-source`}
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setError(null);
                }}
                placeholder="github.com/you/your-app or your-app.com"
                autoComplete="url"
                inputMode="url"
                required
                disabled={loading}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${ids}-error` : `${ids}-source-hint`}
                className="h-11 text-base"
              />
              <Button type="submit" disabled={loading} className="h-11 px-4 text-base">
                {loading ? <Loader2 className="animate-spin" /> : null}
                {loading ? "Reading your app…" : "Generate 3 taglines"}
              </Button>
            </div>
            <p id={`${ids}-source-hint`} className="text-sm text-muted-foreground">
              Public repos only. Uses your free preview allowance; checking stays unlimited.{" "}
              <button
                type="button"
                disabled={loading}
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                onClick={() => {
                  setSource("sample");
                  void generate("sample");
                }}
              >
                Try a sample app
              </button>
            </p>
          </form>

          {error ? (
            <Alert variant="destructive" role="alert" id={`${ids}-error`} data-testid="tagline-error" data-code={error.code}>
              <AlertDescription>
                <p className="font-medium text-foreground">{error.message}</p>
                {error.fix ? <p className="mt-1">{error.fix}</p> : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {options.length ? (
            <section aria-labelledby={`${ids}-options`}>
              <h2 id={`${ids}-options`} className="text-sm font-medium">Three options from your app</h2>
              <ol className="mt-3 space-y-2" data-testid="tagline-options">
                {options.map((option) => (
                  <li key={option} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2">
                      <Counter length={charLength(option)} />
                      <p className="break-words font-medium">{option}</p>
                    </div>
                    <Button type="button" variant="outline" className="h-9 shrink-0 px-3" onClick={() => pickOption(option)} aria-label={`Check “${option}”`}>
                      Check this <ArrowRight />
                    </Button>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </TabsContent>
      </Tabs>

      {showCta ? (
        <aside className="rounded-xl border border-primary/30 bg-primary/5 p-5" data-testid="tagline-cta">
          <h2 className="font-semibold">{mode === "check" && result.verdict === "pass" ? "Your tagline is ready." : "Want the rest of your launch written too?"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get the full Product Hunt post, maker comment, X thread, LinkedIn post and images from the same repo. Start with a free preview; the full kit is £19.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={startHref} className={buttonVariants({ className: "h-10 px-4" })} data-testid="tagline-cta-start">
              Get my free preview <ArrowRight />
            </Link>
            <Link href="/pricing" className={buttonVariants({ variant: "outline", className: "h-10 px-4" })}>
              See the £19 kit
            </Link>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
