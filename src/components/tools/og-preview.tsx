"use client";

import { ArrowRight, CircleCheck, CircleX, ImageOff, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { KitPrice } from "@/components/kit-price";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OG_IMAGE, type OgCard, type OgCheck, type OgImageInfo, type OgTags } from "@/lib/og-check";
import type { CheckStatus } from "@/lib/tagline-check";

interface Preview {
  url: string;
  host: string;
  tags: OgTags;
  image?: OgImageInfo;
  card: OgCard;
  verdict: CheckStatus;
  checks: OgCheck[];
}

interface PreviewError {
  message: string;
  fix?: string;
  code: string;
}

const TAG_ROWS: { key: keyof OgTags; label: string }[] = [
  { key: "ogTitle", label: "og:title" },
  { key: "ogDescription", label: "og:description" },
  { key: "ogImage", label: "og:image" },
  { key: "ogImageWidth", label: "og:image:width" },
  { key: "ogImageHeight", label: "og:image:height" },
  { key: "ogImageAlt", label: "og:image:alt" },
  { key: "ogUrl", label: "og:url" },
  { key: "ogSiteName", label: "og:site_name" },
  { key: "twitterCard", label: "twitter:card" },
  { key: "twitterImage", label: "twitter:image" },
  { key: "title", label: "<title>" },
  { key: "description", label: "meta description" },
];

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
      return "This link will preview properly when you share it.";
    case "warn":
      return `It previews, with ${warnings} thing${warnings === 1 ? "" : "s"} worth fixing.`;
    case "fail":
      return "This link won't preview well yet. Fix the items marked in red.";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

function LinkCard({ preview }: { preview: Preview }) {
  const { card, image, host } = preview;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = card.imageUrl && failedSrc !== card.imageUrl ? card.imageUrl : undefined;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background" data-testid="og-card">
      <div className="relative aspect-[1200/630] bg-muted" data-testid="og-card-image" data-has-image={!!src}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party image, shown exactly as the crawler sees it
          <img src={src} alt={preview.tags.ogImageAlt ?? ""} referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
            <p>{card.imageUrl ? "The image didn't load in your browser either." : "No share image. Most apps show a text-only link here."}</p>
          </div>
        )}
        {image?.width && image.height ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-foreground/80 px-2 py-0.5 font-mono text-xs tabular-nums text-background" data-testid="og-image-size">
            {image.width}×{image.height}
          </span>
        ) : null}
      </div>
      <div className="space-y-1 border-t border-border p-4">
        <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">{host}</p>
        <p className="line-clamp-2 break-words font-semibold" data-testid="og-card-title">{card.title ?? host}</p>
        {card.description ? <p className="line-clamp-2 break-words text-sm text-muted-foreground" data-testid="og-card-description">{card.description}</p> : null}
      </div>
    </div>
  );
}

/** `promo` is isLaunchPromoOn() from the page, for the kit price in the call to action. */
export function OgPreview({ promo }: { promo: boolean }) {
  const [url, setUrl] = useState("");
  const [usedUrl, setUsedUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PreviewError | null>(null);
  const ids = useId();

  async function run(value: string) {
    setError(null);
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/tools/og-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: value }) });
      const data = (await res.json().catch(() => ({}))) as Partial<Preview> & { error?: string; code?: string; fix?: string };
      if (!res.ok || !data.checks) {
        setError({ message: data.error ?? "Something went wrong reading that page.", fix: data.fix ?? "Try again in a moment.", code: data.code ?? "unknown" });
        return;
      }
      setPreview(data as Preview);
      // Our own pages make a pointless kit, so only deep-link the maker's URL.
      setUsedUrl(new URL(data.url!).host === window.location.host ? null : value.trim());
    } catch {
      setError({ message: "We couldn't reach LaunchLoop.", fix: "Check your connection and try again.", code: "network" });
    } finally {
      setLoading(false);
    }
  }

  const warnings = preview?.checks.filter((c) => c.status === "warn").length ?? 0;
  const startHref = usedUrl ? `/?url=${encodeURIComponent(usedUrl)}#start` : "/#start";

  return (
    <div className="space-y-6" data-testid="og-preview">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(url);
        }}
        className="space-y-2"
        aria-label="Preview a link"
      >
        <Label htmlFor={`${ids}-url`}>Live page URL</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`${ids}-url`}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder="your-app.com"
            autoComplete="url"
            inputMode="url"
            required
            disabled={loading}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${ids}-error` : `${ids}-hint`}
            className="h-11 text-base"
          />
          <Button type="submit" disabled={loading} className="h-11 px-4 text-base">
            {loading ? <Loader2 className="animate-spin" /> : null}
            {loading ? "Reading your page…" : "Preview card"}
          </Button>
        </div>
        <p id={`${ids}-hint`} className="text-sm text-muted-foreground">
          Any public page. We read it like a link previewer would and don&apos;t save anything.{" "}
          <button
            type="button"
            disabled={loading}
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            onClick={() => {
              const example = `${window.location.origin}/`;
              setUrl(example);
              void run(example);
            }}
          >
            Try it on LaunchLoop
          </button>
        </p>
      </form>

      {error ? (
        <Alert variant="destructive" role="alert" id={`${ids}-error`} data-testid="og-error" data-code={error.code}>
          <AlertDescription>
            <p className="font-medium text-foreground">{error.message}</p>
            {error.fix ? <p className="mt-1">{error.fix}</p> : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
            <section aria-labelledby={`${ids}-card`} className="space-y-2">
              <h2 id={`${ids}-card`} className="text-sm font-medium">Link preview</h2>
              <LinkCard key={preview.url} preview={preview} />
              <p className="text-xs text-muted-foreground">
                The large card X, LinkedIn, Slack, Facebook and iMessage are based on, framed at {OG_IMAGE.width}×{OG_IMAGE.height}. Images that aren&apos;t 1.91:1 are cropped
                the same way here.
              </p>
            </section>
            <section aria-labelledby={`${ids}-checks`} className="rounded-xl border border-border bg-card p-5">
              <h2 id={`${ids}-checks`} className="text-sm font-medium">Checklist</h2>
              <p data-testid="og-verdict" data-verdict={preview.verdict} aria-live="polite" className="mt-1 text-sm text-muted-foreground">
                {verdictText(preview.verdict, warnings)}
              </p>
              <ul className="mt-4 space-y-3" data-testid="og-checks">
                {preview.checks.map((c) => (
                  <li key={c.id} data-check={c.id} data-status={c.status} className="flex gap-2.5 text-sm">
                    <StatusIcon status={c.status} />
                    <div className="min-w-0">
                      <p className="font-medium">{c.label}</p>
                      <p className="break-words text-muted-foreground">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <details className="rounded-xl border border-border bg-card p-4 text-sm">
            <summary className="cursor-pointer font-medium">Tags we found on {preview.host}</summary>
            <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]" data-testid="og-tags">
              {TAG_ROWS.map((row) => (
                <div key={row.key} className="contents">
                  <dt className="font-mono text-xs text-muted-foreground sm:pt-0.5">{row.label}</dt>
                  <dd className="min-w-0 break-words">{preview.tags[row.key] ?? <span className="text-muted-foreground italic">missing</span>}</dd>
                </div>
              ))}
            </dl>
          </details>

          <aside className="rounded-xl border border-primary/30 bg-primary/5 p-5" data-testid="og-cta">
            <h2 className="font-semibold">{preview.verdict === "pass" ? "Your link card is ready. Now the launch." : "Want a share image that passes every check?"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              LaunchLoop reads your README, package.json, recent commits and live site, then makes a {OG_IMAGE.width}×{OG_IMAGE.height} OG image in your brand colours, plus X and Product Hunt images and all
              your launch copy. Start with a free preview; the full kit is <KitPrice promo={promo} />.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={startHref} className={buttonVariants({ className: "h-10 px-4" })} data-testid="og-cta-start">
                Get my free preview <ArrowRight />
              </Link>
              <Link href="/pricing" className={buttonVariants({ variant: "outline", className: "h-10 px-4" })}>
                See the <KitPrice promo={promo} /> kit
              </Link>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
