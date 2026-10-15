import "server-only";
import { cookies } from "next/headers";
import { ANON_KITS_COOKIE, SESSION_COOKIE, SESSION_HINT_COOKIE, SESSION_TTL_SECONDS, encodeSession, readAnonKits, secureCookies, type MagicLinkRecord } from "./auth";
import { claimKits, getKit } from "./kits";
import { captureException } from "./observability";

/**
 * Sets the session, claims kits and works out where to send the user.
 * The intent comes from the server-side token, so it works from any device:
 * the intended kit is claimed by id as long as nobody else owns it.
 */
export async function completeLogin(record: MagicLinkRecord): Promise<string> {
  const jar = await cookies();
  const secure = secureCookies();
  jar.set(SESSION_COOKIE, encodeSession(record.email), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS });
  jar.set(SESSION_HINT_COOKIE, "1", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS });

  const anon = readAnonKits(jar.get(ANON_KITS_COOKIE)?.value);
  const intentKit = record.intent?.type === "unlock" ? record.intent.kitId : undefined;
  const toClaim = [...new Set([...anon, ...(intentKit ? [intentKit] : [])])];
  let claimed: string[] = [];
  if (toClaim.length) {
    try {
      claimed = await claimKits(record.email, toClaim);
    } catch (error) {
      captureException(error, { stage: "auth.login.claim" });
    }
  }
  if (anon.length) jar.delete(ANON_KITS_COOKIE);

  if (intentKit) {
    const kit = claimed.includes(intentKit) ? await getKit(intentKit).catch(() => null) : null;
    if (!kit) return "/account";
    return kit.paid ? `/account/kits/${kit.id}` : `/kit/${kit.id}?unlock=1`;
  }
  return record.next ?? "/account";
}
