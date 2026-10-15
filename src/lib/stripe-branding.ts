import "server-only";
import { stripe } from "./payments";
import { SITE } from "./site";

/** Cached portal configuration id for this process. */
let portalConfigId: string | null | undefined;

/**
 * Ensures a Customer Portal configuration exists (test or live) branded for LaunchLoop.
 * Account-level logo/colour must be set in the Stripe Dashboard when using test keys —
 * see docs/stripe-branding.md.
 */
export async function ensurePortalConfiguration(): Promise<string | null> {
  if (portalConfigId !== undefined) return portalConfigId;
  const s = stripe();
  if (!s) {
    portalConfigId = null;
    return null;
  }
  const existing = await s.billingPortal.configurations.list({ limit: 10, active: true });
  const preferred =
    existing.data.find((c) => c.is_default) ??
    existing.data.find((c) => c.business_profile?.headline?.includes(SITE.name)) ??
    existing.data[0];
  if (preferred) {
    portalConfigId = preferred.id;
    return portalConfigId;
  }
  const created = await s.billingPortal.configurations.create({
    business_profile: {
      headline: `${SITE.name} billing`,
      privacy_policy_url: "https://launchloop.dev/privacy",
      terms_of_service_url: "https://launchloop.dev/terms",
    },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
  portalConfigId = created.id;
  return portalConfigId;
}

/** Brand colour for Checkout / Portal (set in Dashboard with test keys). */
export const STRIPE_BRAND = {
  displayName: SITE.name,
  primaryColor: "#f2541b",
  iconPath: "public/icons/icon-512.png",
} as const;
