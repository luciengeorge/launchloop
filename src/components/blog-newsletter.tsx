import { NewsletterForm } from "@/components/newsletter-form";
import { postPath, type BlogPost } from "@/lib/blog";
import { PREVIEW_NEWSLETTER_ANCHOR } from "@/lib/newsletter";

/** Quiet next step at the end of every post, after the free-preview CTA, which stays the primary action. */
export function BlogNewsletter({ post }: { post: BlogPost }) {
  return (
    <section
      id={PREVIEW_NEWSLETTER_ANCHOR}
      className="mt-10 flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
      aria-labelledby="blog-newsletter-heading"
      data-testid="blog-newsletter"
    >
      <div className="max-w-md">
        <h2 id="blog-newsletter-heading" className="text-base font-semibold">
          Get my launch-day checklist
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          I&apos;ll email it to you now, then one launch teardown a week. Short, practical, easy to unsubscribe.
        </p>
      </div>
      {/* Static page: the form reads ?from=blog&subscribed= on the client, like the footer, so no `redirected` prop. */}
      <div className="sm:w-96 sm:shrink-0">
        <NewsletterForm
          placement="blog"
          label="Email for the launch-day checklist"
          hideLabel
          hint={null}
          buttonLabel="Send me the checklist"
          buttonVariant="outline"
          returnTo={postPath(post)}
        />
      </div>
    </section>
  );
}
