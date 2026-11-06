import { NewsletterForm } from "@/components/newsletter-form";
import { newsletterReward, PREVIEW_NEWSLETTER_ANCHOR, SIGNUP_COPY } from "@/lib/newsletter";
import { isNewsletterCalendarOn } from "@/lib/newsletter-flag-server";

/** Quiet next step under the paywall for visitors who aren't buying today. The kit CTA above stays the primary action. */
export async function PreviewNewsletter({ kitId, query }: { kitId: string; query: Record<string, string | string[] | undefined> }) {
  const reward = newsletterReward(await isNewsletterCalendarOn());
  const copy = SIGNUP_COPY[reward];
  const param = (key: string) => {
    const value = query[key];
    return query.from === "preview" && typeof value === "string" ? value : undefined;
  };
  const redirected = { subscribed: param("subscribed"), welcome: param("welcome"), error: param("error") };
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
        <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
      </div>
      <div className="sm:w-96 sm:shrink-0">
        <NewsletterForm
          placement="preview"
          reward={reward}
          label={copy.label}
          hideLabel
          hint={null}
          buttonLabel={copy.button}
          buttonVariant="outline"
          returnTo={`/kit/${kitId}`}
          redirected={redirected}
        />
      </div>
    </section>
  );
}
