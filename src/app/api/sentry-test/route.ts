import { createHash, timingSafeEqual } from "node:crypto";
import { captureException } from "@/lib/observability";

const SENTRY_TEST_HEADER = "x-sentry-test-token";

const digest = (value: string) => createHash("sha256").update(value).digest();

function authorised(req: Request): boolean {
  const secret = process.env.SENTRY_TEST_TOKEN?.trim();
  const given = req.headers.get(SENTRY_TEST_HEADER);
  return !!secret && !!given && timingSafeEqual(digest(secret), digest(given));
}

/**
 * Deliberately fails so we can check errors reach Sentry from a real deployment.
 * Without SENTRY_TEST_TOKEN set, or without the matching header, it doesn't exist.
 * `?mode=caught` reports through captureException (like the webhook and Resend paths); otherwise it throws.
 */
export async function GET(req: Request) {
  if (!authorised(req)) return new Response("Not found", { status: 404 });
  const mode = new URL(req.url).searchParams.get("mode") === "caught" ? "caught" : "thrown";
  const error = new Error(`Sentry test error (${mode}) ${crypto.randomUUID()}`);
  if (mode === "caught") {
    captureException(error, { stage: "api.sentry-test" });
    return Response.json({ captured: error.message }, { status: 500 });
  }
  throw error;
}
