"use client";

import { useInlineNewsletterShown } from "@/lib/inline-newsletter-claim";
import { PREVIEW_NEWSLETTER_ANCHOR } from "@/lib/newsletter";
import { usePrimaryCtaClaimed } from "@/lib/primary-cta";
import { NewsletterForm } from "./newsletter-form";

/**
 * On a page with the £19 unlock button, that button is the only primary one. With `inline` (newsletter-inline-signup on),
 * a page that has an inline signup shows a link up to it instead of a second form: globals.css picks one, from the HTML
 * until hydration and from `data-inline-shown` after it.
 */
export function FooterNewsletter({ inline = false }: { inline?: boolean }) {
  const form = <NewsletterForm buttonVariant={usePrimaryCtaClaimed() ? "outline" : "default"} />;
  const shown = useInlineNewsletterShown();
  if (!inline) return form;
  return (
    <div data-footer-newsletter {...(shown === undefined ? {} : { "data-inline-shown": String(shown) })}>
      <div data-footer-newsletter-form>{form}</div>
      <p data-footer-newsletter-link className="text-sm text-muted-foreground">
        Weekly launch teardowns.{" "}
        <a
          href={`#${PREVIEW_NEWSLETTER_ANCHOR}`}
          className="text-foreground underline underline-offset-4"
          data-testid="footer-newsletter-link"
          onClick={(e) => {
            // A page visited earlier can still be in the DOM, hidden, with its own #newsletter: go to the one on screen.
            const target = [...document.querySelectorAll<HTMLElement>("[data-inline-newsletter]")].find((el) => el.checkVisibility());
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ block: "start" });
            target.querySelector<HTMLInputElement>('input[type="email"]')?.focus({ preventScroll: true });
          }}
        >
          Sign up above
        </a>
      </p>
    </div>
  );
}
