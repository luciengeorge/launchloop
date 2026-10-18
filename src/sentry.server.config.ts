import * as Sentry from "@sentry/nextjs";
import { serverSentryOptions } from "./lib/sentry-options";

// Vercel has both set to the same DSN; either one is enough on the server.
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV, ...serverSentryOptions });
}
