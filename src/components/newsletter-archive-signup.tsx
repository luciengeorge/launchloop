import { NewsletterForm } from "@/components/newsletter-form";
import { InlineNewsletterClaim } from "@/lib/inline-newsletter-claim";
import { PREVIEW_NEWSLETTER_ANCHOR, type NewsletterReward, SIGNUP_COPY } from "@/lib/newsletter";

/**
 * The signup on the public newsletter archive (`newsletter` placement): at the top of the index, after the issue on an
 * issue page. Marked like the inline signups, so the footer links up to it instead of showing a second form.
 */
export function NewsletterArchiveSignup({ variant, reward, returnTo }: { variant: "index" | "issue"; reward: NewsletterReward; returnTo: string }) {
  const copy = SIGNUP_COPY[reward];
  return (
    <aside
      id={PREVIEW_NEWSLETTER_ANCHOR}
      className="scroll-mt-24 rounded-2xl border border-border bg-muted/40 p-5"
      aria-labelledby="archive-newsletter-heading"
      data-testid="newsletter-archive-signup"
      data-inline-newsletter
    >
      <InlineNewsletterClaim />
      <p id="archive-newsletter-heading" className="text-base font-semibold">
        {variant === "issue" ? "This is a sample issue. Sign up below and I'll email you the next one." : copy.postTitle}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {variant === "issue" ? copy.body : "I'll email it to you now, then one launch teardown a week. Short, practical, easy to unsubscribe."}
      </p>
      <div className="mt-3">
        <NewsletterForm
          placement="newsletter"
          reward={reward}
          label={copy.label}
          hideLabel
          hint={null}
          buttonLabel={copy.button}
          buttonVariant="outline"
          returnTo={returnTo}
          labelledBy="archive-newsletter-heading"
        />
      </div>
    </aside>
  );
}
