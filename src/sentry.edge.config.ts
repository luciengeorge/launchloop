import * as Sentry from "@sentry/nextjs";
import { serverSentryOptions } from "./lib/sentry-options";

// Nothing runs on the edge runtime today; this keeps Sentry on if a route opts in later.
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV, ...serverSentryOptions });
}
