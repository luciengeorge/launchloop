import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env, forceMock } from "./env";
import { normaliseEmail } from "./kits";
import { store } from "./store";

export { SESSION_HINT_COOKIE } from "./session-hint";

export const SESSION_COOKIE = "ll_session";
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

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const tokenKey = (token: string) => `magic:${sha(token)}`;
const codeKey = (email: string) => `magiccode:${sha(normaliseEmail(email))}`;

/**
 * What the user was doing when they asked to log in. Stored server-side with the token.
 * "unlock" goes on to checkout; "save" just claims the preview so it's in /account.
 */
export type LoginIntent = { type: "unlock" | "save"; kitId: string };

export const KIT_ID_RE = /^[A-Za-z0-9_-]{16,32}$/;

export function parseIntent(value: unknown): LoginIntent | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  return (v.type === "unlock" || v.type === "save") && typeof v.kitId === "string" && KIT_ID_RE.test(v.kitId) ? { type: v.type, kitId: v.kitId } : undefined;
}

export interface MagicLinkRecord {
  email: string;
  next?: string;
  intent?: LoginIntent;
  createdAt: string;
}

interface CodeRecord {
  codeHash: string;
  tokenKey: string;
}

export const CODE_MAX_ATTEMPTS = 5;

/**
 * Creates a signed, single-use token valid for 15 minutes plus a 6-digit code for
 * the same login (typed in the original tab). Only hashes are stored; using either
 * one consumes both.
 */
export async function createMagicToken(email: string, opts: { next?: string; intent?: LoginIntent } = {}): Promise<{ token: string; code: string }> {
  const token = randomBytes(32).toString("base64url");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const key = tokenKey(token);
  await store().set<MagicLinkRecord>(key, { email: normaliseEmail(email), next: opts.next, intent: opts.intent, createdAt: new Date().toISOString() }, MAGIC_LINK_TTL_SECONDS);
  // Latest request wins: an older code stops working, its link still works.
  await store().set<CodeRecord>(codeKey(email), { codeHash: sign(`code:${normaliseEmail(email)}:${code}`), tokenKey: key }, MAGIC_LINK_TTL_SECONDS);
  return { token: `${token}.${sign(`magic:${token}`)}`, code };
}

/** Verifies and consumes a magic-link token. Returns null if invalid, expired or already used. */
export async function consumeMagicToken(signed: string): Promise<MagicLinkRecord | null> {
  const [token, signature, extra] = signed.split(".");
  if (!token || !signature || extra !== undefined || !verifySignature(`magic:${token}`, signature)) return null;
  const record = await store().getDel<MagicLinkRecord>(tokenKey(token));
  if (record) {
    const code = await store().get<CodeRecord>(codeKey(record.email));
    if (code?.tokenKey === tokenKey(token)) await store().getDel(codeKey(record.email));
  }
  return record;
}

/** Verifies and consumes a 6-digit code. Five wrong guesses burn the code (the link still works). */
export async function consumeLoginCode(email: string, code: string): Promise<MagicLinkRecord | "too_many" | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const key = codeKey(email);
  const record = await store().get<CodeRecord>(key);
  if (!record) return null;
  const attempts = await store().incr(`${key}:attempts:${record.tokenKey}`, MAGIC_LINK_TTL_SECONDS);
  if (attempts > CODE_MAX_ATTEMPTS) {
    await store().getDel(key);
    return "too_many";
  }
  if (!verifySignature(`code:${normaliseEmail(email)}:${code}`, record.codeHash)) return null;
  // getDel makes the code single-use even under concurrent submits.
  if (!(await store().getDel<CodeRecord>(key))) return null;
  return store().getDel<MagicLinkRecord>(record.tokenKey);
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
