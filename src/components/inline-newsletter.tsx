import { NewsletterForm } from "@/components/newsletter-form";
import { postPath, type BlogPost } from "@/lib/blog";
import { PREVIEW_NEWSLETTER_ANCHOR } from "@/lib/newsletter";

const LABEL = "Email for the launch-day checklist";
const BUTTON = "Send me the checklist";

/**
 * The early signups behind `newsletter-inline-signup`: after a post's intro (`post`) and under the home hero (`home`).
 * Outline buttons, so the page's filled orange button stays its product call to action. `data-inline-newsletter` is what
 * swaps the footer form for a link to this block (see globals.css).
 */
export function InlineNewsletter(props: { variant: "post"; post: BlogPost } | { variant: "home" }) {
  if (props.variant === "home") {
    return (
      <section
        id={PREVIEW_NEWSLETTER_ANCHOR}
        className="scroll-mt-20 border-b border-border/60 bg-muted/40"
        aria-labelledby="home-newsletter-heading"
        data-testid="inline-newsletter-home"
        data-inline-newsletter
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6">
          <div className="max-w-xl">
            <h2 id="home-newsletter-heading" className="text-base font-semibold">
              Not launching this week?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              I&apos;ll email you my launch-day checklist now, then one launch teardown a week. Short, practical, easy to unsubscribe.
            </p>
          </div>
          <div className="sm:w-96 sm:shrink-0">
            <NewsletterForm placement="home_inline" label={LABEL} hideLabel hint={null} buttonLabel={BUTTON} buttonVariant="outline" returnTo="/" labelledBy="home-newsletter-heading" />
          </div>
        </div>
      </section>
    );
  }
  return (
    // A <p> title, not an h2, so the post's outline is unchanged. The post body's `[&_p]` mutes every <p> in it and outranks
    // a plain utility, so the title and the form's error messages restate their colours.
    <aside
      id={PREVIEW_NEWSLETTER_ANCHOR}
      className="scroll-mt-24 rounded-2xl border border-border bg-muted/40 p-4 [&_p.text-destructive]:text-destructive"
      aria-labelledby="inline-newsletter-heading"
      data-testid="inline-newsletter-post"
      data-inline-newsletter
    >
      <p id="inline-newsletter-heading" className="text-base font-semibold text-foreground!">
        Get my launch-day checklist
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        I&apos;ll email it to you now, then one launch teardown a week. Short, practical, easy to unsubscribe.
      </p>
      <div className="mt-3">
        <NewsletterForm
          placement="blog_inline"
          label={LABEL}
          hideLabel
          hint={null}
          buttonLabel={BUTTON}
          buttonVariant="outline"
          returnTo={postPath(props.post)}
          labelledBy="inline-newsletter-heading"
        />
      </div>
    </aside>
  );
}
