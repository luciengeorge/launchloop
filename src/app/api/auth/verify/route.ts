import { cookies } from "next/headers";
import {
  ANON_KITS_COOKIE,
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
  SESSION_TTL_SECONDS,
  consumeMagicToken,
  encodeSession,
  readAnonKits,
  secureCookies,
  seeOther,
} from "@/lib/auth";
import { readBody } from "@/lib/form-body";
import { claimKits } from "@/lib/kits";
import { captureException } from "@/lib/observability";

/**
 * Consumes a magic-link token (POST only, so link scanners that prefetch the
 * GET page can't burn it), sets the session and claims this browser's kits.
 */
export async function POST(req: Request) {
  const { data } = await readBody(req);
  const record = typeof data.token === "string" ? await consumeMagicToken(data.token) : null;
  if (!record) return seeOther("/login?error=expired");

  const jar = await cookies();
  const secure = secureCookies();
  jar.set(SESSION_COOKIE, encodeSession(record.email), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS });
  jar.set(SESSION_HINT_COOKIE, "1", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS });

  const anon = readAnonKits(jar.get(ANON_KITS_COOKIE)?.value);
  if (anon.length) {
    try {
      await claimKits(record.email, anon);
    } catch (error) {
      captureException(error, { stage: "api.auth.verify.claim" });
    }
    jar.delete(ANON_KITS_COOKIE);
  }
  return seeOther(record.next ?? "/account");
}
