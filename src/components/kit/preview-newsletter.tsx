import { NewsletterForm } from "@/components/newsletter-form";
import { PREVIEW_NEWSLETTER_ANCHOR } from "@/lib/newsletter";

/** Quiet next step under the paywall for visitors who aren't buying today. The kit CTA above stays the primary action. */
export function PreviewNewsletter({ kitId, query }: { kitId: string; query: Record<string, string | string[] | undefined> }) {
  const subscribed = query.from === "preview" && typeof query.subscribed === "string" ? query.subscribed : undefined;
  return (
    <section
      id={PREVIEW_NEWSLETTER_ANCHOR}
      className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
      aria-labelledby="preview-newsletter-heading"
      data-testid="preview-newsletter"
    >
      <div className="max-w-md">
        <h2 id="preview-newsletter-heading" className="text-base font-semibold">
          Not launching this week?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          I&apos;ll email you my launch-day checklist now, then one launch teardown a week. Short, practical, easy to unsubscribe.
        </p>
      </div>
      <div className="sm:w-96 sm:shrink-0">
        <NewsletterForm
          placement="preview"
          label="Email for the launch-day checklist"
          hideLabel
          hint={null}
          buttonLabel="Send me the checklist"
          buttonVariant="outline"
          returnTo={`/kit/${kitId}`}
          redirected={subscribed}
        />
      </div>
    </section>
  );
}
