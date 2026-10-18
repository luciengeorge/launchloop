/** Where a newsletter signup happened. Stored on the contact and sent with the `newsletter_subscribed` event. */
export type NewsletterPlacement = "footer" | "preview";

export const parsePlacement = (value: unknown): NewsletterPlacement => (value === "preview" ? "preview" : "footer");

/** The lead magnet: the public checklist guide, linked from the success state and the welcome email. */
export const LEAD_MAGNET = { title: "launch-day checklist", path: "/product-hunt-launch-checklist" } as const;

/** Anchor of the post-preview signup, so a no-JS form post lands back on its success message. */
export const PREVIEW_NEWSLETTER_ANCHOR = "newsletter";
