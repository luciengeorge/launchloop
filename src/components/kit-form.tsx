"use client";

import { ArrowRight, Check, Circle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type PreviewSource, track } from "@/lib/analytics";
import { KitRequestError, createKitWithProgress } from "@/lib/client";
import { hasSessionHint } from "@/lib/session-hint";
import { START_EVENT, type StartPlan } from "@/lib/start-intent";

const previewSource = (value: string): PreviewSource => (value === "sample" ? "sample" : /github\.com/i.test(value) ? "github" : "site");

const STEPS = [
  { id: "repo", label: "Reading repo" },
  { id: "site", label: "Reading site" },
  { id: "brief", label: "Writing brief" },
  { id: "copy", label: "Writing copy" },
  { id: "images", label: "Drawing images" },
] as const;

export function KitForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState<{ message: string; fix?: string; code: string } | null>(null);

  const [plan, setPlan] = useState<StartPlan>("free");
  const inputRef = useRef<HTMLInputElement>(null);
  // What the last run actually sent: "Try a sample app" leaves the input empty, so retry can't use `url`.
  const lastInput = useRef("");

  // Arriving via /#start or ?plan=kit (or a StartLink on this page): scroll to the form, focus it, preselect the plan.
  // ?url= prefills the input, e.g. when a free tool hands over the repo it just read.
  useEffect(() => {
    const focusForm = (nextPlan?: StartPlan) => {
      if (nextPlan) setPlan(nextPlan);
      const anchor = document.getElementById("start") ?? inputRef.current;
      anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
      inputRef.current?.focus({ preventScroll: true });
    };
    const fromUrl = () => {
      const params = new URLSearchParams(location.search);
      const urlPlan = params.get("plan") === "kit" ? "kit" : undefined;
      const prefill = params.get("url")?.trim();
      if (urlPlan) setPlan(urlPlan);
      if (prefill) setUrl(prefill);
      if (location.hash === "#start" || urlPlan) requestAnimationFrame(() => focusForm(urlPlan));
    };
    const onStart = (e: Event) => focusForm((e as CustomEvent<{ plan?: StartPlan }>).detail?.plan ?? "free");
    fromUrl();
    window.addEventListener("hashchange", fromUrl);
    window.addEventListener(START_EVENT, onStart);
    return () => {
      window.removeEventListener("hashchange", fromUrl);
      window.removeEventListener(START_EVENT, onStart);
    };
  }, []);

  const advance = (id: string) => {
    const index = STEPS.findIndex((s) => s.id === id);
    if (index >= 0) setStep((current) => Math.max(current, index));
  };

  async function submit(value: string) {
    lastInput.current = value;
    setError(null);
    setLoading(true);
    setStep(-1);
    const context = { source: previewSource(value), plan, isLoggedIn: hasSessionHint() };
    const startedAt = performance.now();
    track("preview_started", context);
    try {
      const { url: next } = await createKitWithProgress(value, advance);
      const kitId = next.split("/").pop();
      if (kitId) track("preview_completed", { ...context, kitId, durationMs: Math.round(performance.now() - startedAt) });
      // Preview images render on the kit page itself.
      advance("images");
      // Kit intent: open the kit with the unlock flow already started.
      router.push(plan === "kit" && kitId ? `/kit/${kitId}?unlock=1` : next);
    } catch (err) {
      track("preview_failed", { ...context, code: err instanceof KitRequestError ? err.code : "unknown", durationMs: Math.round(performance.now() - startedAt) });
      setError(err instanceof KitRequestError ? { message: err.message, fix: err.fix, code: err.code } : { message: "Something went wrong.", fix: "Try again in a moment.", code: "unknown" });
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(url);
        }}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg shadow-primary/5 sm:flex-row"
        aria-label="Generate a launch kit"
      >
        <label htmlFor="app-url" className="sr-only">
          GitHub repo or live site URL
        </label>
        <Input
          id="app-url"
          ref={inputRef}
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="github.com/you/your-app or your-app.com"
          autoComplete="url"
          inputMode="url"
          required
          disabled={loading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "kit-form-error" : undefined}
          className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 sm:text-base"
        />
        <Button type="submit" disabled={loading} className="h-12 px-5 text-base">
          {loading ? <Loader2 className="animate-spin" /> : null}
          {loading ? "Reading your app…" : plan === "kit" ? "Get my launch kit, £19" : "Get my free preview"}
          {loading ? null : <ArrowRight />}
        </Button>
      </form>

      <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {loading ? (
          <ol role="status" aria-live="polite" aria-label="Progress" data-testid="kit-progress" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step || (step < 0 && i === 0) ? "active" : "pending";
              return (
                <li key={s.id} data-state={state} className={`flex items-center gap-1.5 ${state === "pending" ? "opacity-50" : state === "active" ? "text-foreground" : ""}`}>
                  {state === "done" ? <Check className="size-3.5 text-primary" /> : state === "active" ? <Loader2 className="size-3.5 animate-spin" /> : <Circle className="size-3" />}
                  {s.label}
                </li>
              );
            })}
          </ol>
        ) : (
          <>
            <span data-plan={plan}>{plan === "kit" ? "Launch Kit, £19 once · Preview first, then secure Stripe checkout" : "Free preview · No sign-up · Public repos only"}</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <button type="button" className="font-medium text-foreground underline underline-offset-4 hover:text-primary" onClick={() => void submit("sample")}>
              Try a sample app
            </button>
          </>
        )}
      </div>

      {error ? (
        <Alert variant="destructive" role="alert" id="kit-form-error" data-testid="kit-error" data-code={error.code} className="text-left">
          <AlertDescription>
            <p className="font-medium text-foreground">{error.message}</p>
            {error.fix ? <p className="mt-1">{error.fix}</p> : null}
            {error.code === "llm_failed" || error.code === "site_timeout" || error.code === "network" ? (
              <button type="button" className="mt-2 font-medium underline underline-offset-4" onClick={() => void submit(lastInput.current)}>
                Try again
              </button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
