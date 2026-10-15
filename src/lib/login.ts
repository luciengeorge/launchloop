import "server-only";
import { cookies } from "next/headers";
import { after } from "next/server";
import { ANON_KITS_COOKIE, SESSION_COOKIE, SESSION_HINT_COOKIE, SESSION_TTL_SECONDS, encodeSession, readAnonKits, secureCookies, type MagicLinkRecord } from "./auth";
import { ensureStripeCustomer } from "./billing";
import { isStripeMock } from "./env";
import { withAnalyticsId } from "./experiments";
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

  // Every account has a Stripe customer. Done after the response so Stripe never slows login;
  // the billing portal route calls the same helper if this didn't finish.
  if (!isStripeMock()) {
    after(async () => {
      try {
        await ensureStripeCustomer(record.email);
      } catch (error) {
        captureException(error, { stage: "auth.login.stripeCustomer" });
      }
    });
  }

  const anon = readAnonKits(jar.get(ANON_KITS_COOKIE)?.value);
  const intentKit = record.intent?.kitId;
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
    if (kit.paid) return `/account/kits/${kit.id}`;
    return withAnalyticsId(record.intent?.type === "unlock" ? `/kit/${kit.id}?unlock=1` : `/kit/${kit.id}?saved=1`, record.intent?.aid);
  }
  return record.next ?? "/account";
}
