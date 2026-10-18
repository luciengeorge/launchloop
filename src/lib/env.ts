import "server-only";

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** MOCK_MODE=true forces every integration into mock mode, even when keys are present. */
export const forceMock = read("MOCK_MODE") === "true";

export const env = {
  stripeSecretKey: forceMock ? undefined : read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  stripePriceKit: read("STRIPE_PRICE_KIT"),
  /** Promotion code id (promo_…) for LAUNCH14. Optional: without it Checkout looks the code up by name. */
  stripePromoLaunch14: read("STRIPE_PROMO_LAUNCH14"),

  resendApiKey: forceMock ? undefined : read("RESEND_API_KEY"),
  resendFrom: read("RESEND_FROM") ?? "LaunchLoop <onboarding@resend.dev>",
  resendReplyTo: read("RESEND_REPLY_TO"),
  resendAudienceId: read("RESEND_AUDIENCE_ID"),
  resendSegmentId: read("RESEND_SEGMENT_ID"),

  llmProvider: read("LLM_PROVIDER"),
  aiGatewayApiKey: read("AI_GATEWAY_API_KEY"),
  aiGatewayModel: read("AI_GATEWAY_MODEL"),
  aiGatewayFallbackModels: read("AI_GATEWAY_FALLBACK_MODELS"),

  githubToken: read("GITHUB_TOKEN"),

  kvUrl: read("KV_REST_API_URL") ?? read("UPSTASH_REDIS_REST_URL"),
  kvToken: read("KV_REST_API_TOKEN") ?? read("UPSTASH_REDIS_REST_TOKEN"),
  dataDir: read("DATA_DIR"),

  ingestAllowPrivate: read("INGEST_ALLOW_PRIVATE") === "true",
  sentryDsn: read("SENTRY_DSN"),
  posthogKey: read("NEXT_PUBLIC_POSTHOG_KEY"),
  authSecret: read("AUTH_SECRET"),
};

export const isStripeMock = () => !env.stripeSecretKey;
export const isEmailMock = () => !env.resendApiKey;

export function siteUrl(): string {
  const explicit = read("NEXT_PUBLIC_SITE_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = read("VERCEL_PROJECT_PRODUCTION_URL");
  if (vercel) return `https://${vercel}`;
  return `http://localhost:${read("PORT") ?? "3417"}`;
}

/**
 * Base URL for links that must land on this exact deployment (magic links).
 * Previews point at their branch URL, not the production NEXT_PUBLIC_SITE_URL.
 */
export function deploymentUrl(): string {
  if (read("VERCEL_ENV") === "preview") {
    const host = read("VERCEL_BRANCH_URL") ?? read("VERCEL_URL");
    if (host) return `https://${host}`;
  }
  return siteUrl();
}
