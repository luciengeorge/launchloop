import type { Instrumentation } from "next";
import { captureException } from "./lib/observability";

/**
 * Server error hooks. To add Sentry: `npm i @sentry/nextjs`, initialise it in
 * `register()` when SENTRY_DSN is set, and add
 * `registerErrorHook((e, ctx) => Sentry.captureException(e, { extra: ctx }))`.
 */
export async function register() {
  if (process.env.SENTRY_DSN) {
    console.info("[launchloop] SENTRY_DSN is set: wire @sentry/nextjs in src/instrumentation.ts to start reporting.");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  captureException(error, {
    stage: "next.onRequestError",
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    digest: typeof error === "object" && error && "digest" in error ? String(error.digest) : undefined,
  });
};
