import "server-only";
import { isStripeMock } from "./env";

/** Diagnostics that must never run in production: preview deployments, local dev and mock mode only. */
export const devToolsEnabled = () => process.env.VERCEL_ENV !== "production" && (process.env.VERCEL_ENV === "preview" || !process.env.VERCEL || isStripeMock());
