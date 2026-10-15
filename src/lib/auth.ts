import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env, forceMock } from "./env";
import { normaliseEmail } from "./kits";
import { store } from "./store";

export const SESSION_COOKIE = "ll_session";
/** Non-secret hint so client code can tell a session exists. Never trusted on the server. */
export const SESSION_HINT_COOKIE = "ll_auth";
/** Kit ids created anonymously in this browser, claimed on login. */
export const ANON_KITS_COOKIE = "ll_kits";

export const MAGIC_LINK_TTL_SECONDS = 15 * 60;
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const DEV_SECRET = "launchloop-dev-only-auth-secret-not-for-production";

function secret(): string {
  if (env.authSecret) return env.authSecret;
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    if (!forceMock) throw new Error("AUTH_SECRET is not set");
  }
  return DEV_SECRET;
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

function verifySignature(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const tokenKey = (token: string) => `magic:${createHash("sha256").update(token).digest("hex")}`;

interface MagicLinkRecord {
  email: string;
  next?: string;
  createdAt: string;
}

/** Creates a signed, single-use token valid for 15 minutes. Only its hash is stored. */
export async function createMagicToken(email: string, next?: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await store().set<MagicLinkRecord>(tokenKey(token), { email: normaliseEmail(email), next, createdAt: new Date().toISOString() }, MAGIC_LINK_TTL_SECONDS);
  return `${token}.${sign(`magic:${token}`)}`;
}

/** Verifies and consumes a magic-link token. Returns null if invalid, expired or already used. */
export async function consumeMagicToken(signed: string): Promise<MagicLinkRecord | null> {
  const [token, signature, extra] = signed.split(".");
  if (!token || !signature || extra !== undefined || !verifySignature(`magic:${token}`, signature)) return null;
  return store().getDel<MagicLinkRecord>(tokenKey(token));
}

export interface Session {
  email: string;
  exp: number;
}

export function encodeSession(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email: normaliseEmail(email), exp: Date.now() + SESSION_TTL_SECONDS * 1000 } satisfies Session)).toString("base64url");
  return `${payload}.${sign(`session:${payload}`)}`;
}

export function decodeSession(value: string | undefined): Session | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  try {
    if (!verifySignature(`session:${payload}`, signature)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (typeof session.email !== "string" || typeof session.exp !== "number" || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** Reads the session from the request cookies (server components and route handlers). */
export async function getSession(): Promise<Session | null> {
  // Expiry checks read the clock, so this must run at request time.
  await connection();
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export const secureCookies = () => process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://");

export function readAnonKits(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").filter((id) => /^[A-Za-z0-9_-]{16,32}$/.test(id)).slice(-50);
}

/** Only allow relative, same-origin redirect targets after login. */
export function safeNext(next: unknown): string | undefined {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : undefined;
}

/** 303 to a same-origin path with a relative Location, so it stays on whatever host the request used. */
export const seeOther = (path: string) => new Response(null, { status: 303, headers: { Location: path } });
