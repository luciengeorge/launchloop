"use client";

import { PREVIEW_NEWSLETTER_ANCHOR } from "@/lib/newsletter";
import { usePrimaryCtaClaimed } from "@/lib/primary-cta";
import { NewsletterForm } from "./newsletter-form";

/**
 * On a page with the £19 unlock button, that button is the only primary one. With `inline` (newsletter-inline-signup on),
 * a page that has an inline signup shows a link up to it instead of a second form (globals.css chooses which).
 */
export function FooterNewsletter({ inline = false }: { inline?: boolean }) {
  const form = <NewsletterForm buttonVariant={usePrimaryCtaClaimed() ? "outline" : "default"} />;
  if (!inline) return form;
  return (
    <>
      <div data-footer-newsletter-form>{form}</div>
      <p data-footer-newsletter-link className="text-sm text-muted-foreground">
        Weekly launch teardowns.{" "}
        <a href={`#${PREVIEW_NEWSLETTER_ANCHOR}`} className="text-foreground underline underline-offset-4" data-testid="footer-newsletter-link">
          Sign up above
        </a>
      </p>
    </>
  );
}
