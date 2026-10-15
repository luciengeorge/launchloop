/**
 * Deployment environment helpers. Pure (no server-only) so Playwright can unit-test them.
 * Production keeps unprefixed Redis keys so existing data is untouched.
 */
export type DeployEnv = "production" | "preview" | "development";

export function deployEnv(vercelEnv: string | undefined = process.env.VERCEL_ENV): DeployEnv {
  const v = vercelEnv?.trim();
  return v === "production" || v === "preview" ? v : "development";
}

export function keyPrefix(e: DeployEnv = deployEnv()): string {
  return e === "production" ? "" : e === "preview" ? "preview:" : "dev:";
}

export type StripeEventDecision = { handle: true } | { handle: false; reason: string };

/**
 * Decides whether this deployment should act on a Stripe checkout event or return page.
 * - Sessions without `env` metadata predate this check and belong to production.
 * - Test-mode events are ignored only once this deployment runs on live keys.
 */
export function stripeEventDecision(params: {
  metadataEnv: string | undefined | null;
  livemode: boolean;
  current: DeployEnv;
  secretKey: string | undefined;
}): StripeEventDecision {
  const origin = params.metadataEnv?.trim() || "production";
  if (origin !== params.current) return { handle: false, reason: `session belongs to ${origin}, this is ${params.current}` };
  const liveKeys = params.secretKey?.startsWith("sk_live_") || params.secretKey?.startsWith("rk_live_");
  if (params.current === "production" && liveKeys && !params.livemode) return { handle: false, reason: "test-mode event on live production" };
  return { handle: true };
}
