"use client";

import { usePrimaryCtaClaimed } from "@/lib/primary-cta";
import { NewsletterForm } from "./newsletter-form";

/** On a page with the £19 unlock button, that button is the only primary one. */
export function FooterNewsletter() {
  return <NewsletterForm buttonVariant={usePrimaryCtaClaimed() ? "outline" : "default"} />;
}
