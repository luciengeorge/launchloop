"use client";

import { ArrowRight, Check, Circle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type PreviewSource, track } from "@/lib/analytics";
import { type KitFailureDetails, KitRequestError, createKitWithProgress } from "@/lib/client";
import { previewAllowance } from "@/lib/errors";
import { SAMPLE_INPUT } from "@/lib/ingest/sample";
import type { PreviewLimits } from "@/lib/site";
import { ON_PRIMARY_TEXT } from "@/lib/primary-cta";
import { LAUNCH_PROMO } from "@/lib/products";
import { looksLikeGitHubUrl, replacesPrefix, repoPrefill, sameInput } from "@/lib/repo-cta";
import { hasSessionHint } from "@/lib/session-hint";
import { START_EVENT, type StartPlan } from "@/lib/start-intent";
import { sampleCtaLayout, useHeroSampleCta } from "./home-hero";
import { KitPrice } from "./kit-price";
import { RateLimitActions } from "./rate-limit-actions";

const previewSource = (value: string): PreviewSource => (value === SAMPLE_INPUT ? "sample" : /github\.com/i.test(value) ? "github" : "site");

/** Our side is out of capacity: the AI (ai_busy) or the daily free-preview budget (busy). Same UI, different wording. */
const CAPACITY_CODES = new Set(["ai_busy", "busy"]);

/** The link can't be read as sent (a bad link, or a repo we can't or won't read), so the alert offers two ways forward. */
const WAY_FORWARD_CODES = new Set(["invalid_url", "repo_not_found", "repo_private"]);

const STEPS = [
  { id: "repo", label: "Reading repo" },
  { id: "site", label: "Reading site" },
  { id: "brief", label: "Writing brief" },
  { id: "copy", label: "Writing copy" },
  { id: "images", label: "Drawing images" },
] as const;

type FormError = { message: string; fix?: string; code: string; limit?: { retryAt: number; limits?: PreviewLimits; kitId?: string } };

/** `promo` is isLaunchPromoOn() from the page: the Launch Kit price shown when the kit plan is picked. */
export function KitForm({ promo }: { promo: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState<FormError | null>(null);
  // The link that last failed with site_no_content. Sending it again fails the same way, so the form won't.
  const [noContent, setNoContent] = useState<{ input: string; error: FormError } | null>(null);
  const [repoMode, setRepoMode] = useState(false);
  const repoCtaRef = useRef<HTMLButtonElement>(null);

  const [plan, setPlan] = useState<StartPlan>("free");
  const inputRef = useRef<HTMLInputElement>(null);
  // What the last run actually sent: "Try a sample app" leaves the input empty, so retry can't use `url`.
  const lastInput = useRef("");
  const sampleCta = useHeroSampleCta();
  const sampleRow = sampleCtaLayout(sampleCta);

  // Arriving via /#start or ?plan=kit (or a StartLink on this page): scroll to the form, focus it, preselect the plan.
  // ?url= prefills the input, e.g. when a free tool hands over the repo it just read.
  useEffect(() => {
    const focusForm = (nextPlan?: StartPlan) => {
      if (nextPlan) {
        setPlan(nextPlan);
        setError(null);
      }
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
      if (urlPlan || prefill) setError(null);
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
      const durationMs = Math.round(performance.now() - startedAt);
      const known = err instanceof KitRequestError ? err : null;
      const { kitId, ...details }: KitFailureDetails = known?.details ?? { errorName: err instanceof Error ? err.name : typeof err };
      // The server accepted the preview and keeps writing it, so the kit page can wait for it instead.
      const recovered = !!kitId && (known?.code === "network" || known?.code === "aborted");
      track("preview_failed", { ...context, code: known?.code ?? "unknown", durationMs, ...details, ...(recovered ? { recovered } : {}) });
      if (recovered) {
        router.push(plan === "kit" ? `/kit/${kitId}?unlock=1` : `/kit/${kitId}`);
        return;
      }
      const limit = known?.rateLimit && { retryAt: Date.now() + known.rateLimit.retryAfterSeconds * 1000, limits: known.rateLimit.limits, kitId: known.rateLimit.kitId };
      const failure: FormError = known ? { message: known.message, fix: known.fix, code: known.code, limit } : { message: "Something went wrong.", fix: "Try again in a moment.", code: "unknown" };
      setError(failure);
      if (failure.code === "site_no_content") {
        setNoContent({ input: value, error: failure });
        track("repo_cta_shown", { code: "site_no_content", plan, isLoggedIn: context.isLoggedIn });
      }
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  // Only site_no_content blocks a resend: limits, outages and dropped connections are worth retrying as they are.
  const blockedBy = !loading && noContent && sameInput(url, noContent.input) ? noContent : null;
  // Typing the failed link back in brings its error, and the way out, back with it.
  const shownError = error ?? blockedBy?.error ?? null;

  /** Empties the input and leaves repo-only mode, so the placeholder's site URL hint shows and the next paste can be a site. */
  const switchToSite = () => {
    setRepoMode(false);
    setUrl("");
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const switchToRepo = () => {
    const { value, prefill } = repoPrefill(noContent?.input ?? url);
    track("repo_cta_clicked", { code: "site_no_content", plan, isLoggedIn: hasSessionHint(), prefill });
    setRepoMode(true);
    setUrl(value);
    setError(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(value.length, value.length);
    });
  };

  return (
    <div className="w-full max-w-2xl space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (blockedBy) {
            track("preview_resubmit_blocked", { code: "site_no_content", plan, isLoggedIn: hasSessionHint() });
            repoCtaRef.current?.focus();
            return;
          }
          void submit(url);
        }}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg shadow-primary/5 sm:flex-row"
        aria-label="Generate a launch kit"
      >
        <label htmlFor="app-url" className="sr-only">
          {repoMode ? "GitHub repo URL" : "GitHub repo or live site URL"}
        </label>
        <Input
          id="app-url"
          ref={inputRef}
          name="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            // An error is about the input that was sent; once it changes (repo to site, say) it no longer applies.
            setError(null);
            if (!looksLikeGitHubUrl(e.target.value)) setRepoMode(false);
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (!replacesPrefix(url, pasted)) return;
            e.preventDefault();
            setUrl(pasted.trim());
            setError(null);
            if (!looksLikeGitHubUrl(pasted)) setRepoMode(false);
          }}
          placeholder={repoMode ? "github.com/you/your-app" : "github.com/you/your-app or your-app.com"}
          autoComplete="url"
          inputMode="url"
          required
          disabled={loading}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? "kit-form-error" : undefined}
          className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 sm:text-base"
        />
        {/* aria-disabled rather than disabled: Enter and clicks still reach onSubmit, which moves focus to the repo button. */}
        <Button
          type="submit"
          disabled={loading}
          aria-disabled={blockedBy ? true : undefined}
          aria-describedby={blockedBy ? "kit-form-resubmit-hint" : undefined}
          className={`h-12 px-5 text-base aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${ON_PRIMARY_TEXT}`}
        >
          {loading ? <Loader2 className="animate-spin" /> : null}
          {loading ? (
            "Reading your app…"
          ) : plan === "kit" ? (
            <>
              Get my launch kit, <KitPrice promo={promo} />
            </>
          ) : (
            "Get my free preview"
          )}
          {loading ? null : <ArrowRight />}
        </Button>
      </form>

      <div className={sampleRow.row}>
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
            <span data-plan={plan}>
              {plan === "kit" ? (
                <>
                  Launch Kit, <KitPrice promo={promo} /> once · {promo ? `${LAUNCH_PROMO.code} applied at checkout` : "Preview first, then secure Stripe checkout"}
                </>
              ) : (
                "Free preview · No sign-up · Public repos only"
              )}
            </span>
            <span aria-hidden="true" className={sampleRow.separator}>·</span>
            <button type="button" className={sampleRow.button} data-variant={sampleCta ?? undefined} onClick={() => void submit(SAMPLE_INPUT)}>
              Try a sample app
            </button>
          </>
        )}
      </div>

      {shownError ? (
        // Capacity, AI outages and limits ("Try again in N min") aren't the visitor's mistake, so they aren't styled as errors.
        <Alert variant={CAPACITY_CODES.has(shownError.code) || shownError.code === "rate_limited" ? "default" : "destructive"} role="alert" id="kit-form-error" data-testid="kit-error" data-code={shownError.code} className="text-left">
          <AlertDescription>
            <p className="font-medium text-foreground">{shownError.message}</p>
            {/* With a limit, the wait is the countdown button's alone, so this copy never shows a stale "Try again in N min".
                The numbers come from the server: this bundle can't see the limiter's env overrides. */}
            {shownError.limit ? (
              shownError.limit.limits ? <p className="mt-1">{previewAllowance(shownError.limit.limits)}</p> : null
            ) : shownError.fix ? (
              <p className="mt-1">{shownError.fix}</p>
            ) : null}
            {CAPACITY_CODES.has(shownError.code) || shownError.code === "site_timeout" || shownError.code === "network" || shownError.code === "aborted" ? (
              <button type="button" className="mt-2 font-medium underline underline-offset-4" onClick={() => void submit(lastInput.current)}>
                {CAPACITY_CODES.has(shownError.code) ? "Retry" : "Try again"}
              </button>
            ) : null}
            {WAY_FORWARD_CODES.has(shownError.code) ? (
              <div className="mt-3 flex flex-wrap gap-2" data-testid="kit-error-actions">
                <Button type="button" onClick={switchToSite} className="h-11 px-4 text-sm sm:h-10" data-testid="kit-site-cta">
                  Try your site URL instead
                  <ArrowRight />
                </Button>
                <Button type="button" variant="outline" onClick={() => void submit(SAMPLE_INPUT)} className="h-11 px-4 text-sm sm:h-10" data-testid="kit-sample-cta">
                  Try a sample app
                </Button>
              </div>
            ) : null}
            {shownError.code === "site_no_content" ? (
              <>
                {blockedBy ? (
                  <p id="kit-form-resubmit-hint" data-testid="kit-resubmit-hint" className="mt-1">
                    Sending this link again will fail the same way. Change it, or use your repo:
                  </p>
                ) : null}
                <Button
                  ref={repoCtaRef}
                  type="button"
                  onClick={switchToRepo}
                  aria-describedby={blockedBy ? "kit-form-resubmit-hint" : undefined}
                  className="h-11 px-4 text-sm sm:h-10"
                  data-testid="kit-repo-cta"
                >
                  Use my GitHub repo instead
                  <ArrowRight />
                </Button>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {/* Outside the alert: inside role="alert" the countdown would be re-announced every minute. */}
      {error?.limit ? <RateLimitActions kitId={error.limit.kitId} retryAt={error.limit.retryAt} promo={promo} onRetry={() => void submit(lastInput.current)} /> : null}
    </div>
  );
}
