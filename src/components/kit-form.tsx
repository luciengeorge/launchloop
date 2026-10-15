"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client";

const STEPS = ["Reading your README", "Checking package.json and recent commits", "Scraping your live page for brand colours", "Writing your product brief", "Drafting your preview"];

export function KitForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1600);
    return () => clearInterval(timer);
  }, [loading]);

  async function submit(value: string) {
    setError(null);
    setLoading(true);
    setStep(0);
    try {
      const { url: next } = await postJson<{ url: string }>("/api/kits", { url: value });
      router.push(next);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
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
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="github.com/you/your-app or your-app.com"
          autoComplete="url"
          inputMode="url"
          required
          disabled={loading}
          className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 sm:text-base"
        />
        <Button type="submit" disabled={loading} className="h-12 px-5 text-base">
          {loading ? <Loader2 className="animate-spin" /> : null}
          {loading ? "Reading your app…" : "Get my free preview"}
          {loading ? null : <ArrowRight />}
        </Button>
      </form>

      <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {loading ? (
          <p role="status" aria-live="polite" className="flex items-center gap-2">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
            {STEPS[step]}…
          </p>
        ) : (
          <>
            <span>Free preview · No sign-up · Public repos only</span>
            <span aria-hidden="true">·</span>
            <button type="button" className="font-medium text-foreground underline underline-offset-4 hover:text-primary" onClick={() => void submit("sample")}>
              Try a sample app
            </button>
          </>
        )}
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
