// Loaded with import() by sentry-client.ts. Importing the package itself that way would bundle all of it (Replay,
// Feedback and more), because a dynamic import can't be tree-shaken; these named re-exports can.
export { captureException, captureRouterTransitionStart, init } from "@sentry/nextjs";
