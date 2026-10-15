import { isEmail, isUndeliverableEmail } from "@/lib/audience";
import { createMagicToken, parseIntent, safeNext, seeOther } from "@/lib/auth";
import { magicLinkEmail, sendEmail } from "@/lib/email";
import { deploymentUrl } from "@/lib/env";
import { readBody } from "@/lib/form-body";
import { normaliseEmail } from "@/lib/kits";
import { LOGIN_ERRORS, type LoginErrorCode } from "@/lib/login-errors";
import { captureException } from "@/lib/observability";
import { clientIp } from "@/lib/rate-limit";
import { store } from "@/lib/store";

const PER_IP_PER_HOUR = Number(process.env.MAGIC_LINK_RATE_LIMIT_PER_IP ?? 10);
const PER_EMAIL_PER_HOUR = Number(process.env.MAGIC_LINK_RATE_LIMIT_PER_EMAIL ?? 5);

/** Sends a magic login link. Rate limited per IP and per email (shared via the store, so it holds across instances). */
export async function POST(req: Request) {
  const { data, isForm } = await readBody(req);
  const next = safeNext(data.next);
  const intent = parseIntent(typeof data.intent === "string" ? safeJson(data.intent) : data.intent);
  const fail = (status: number, code: LoginErrorCode) =>
    isForm ? seeOther(`/login?error=${code}${next ? `&next=${encodeURIComponent(next)}` : ""}`) : Response.json({ error: LOGIN_ERRORS[code], code }, { status });

  if (!isEmail(data.email)) return fail(400, "invalid");
  const email = normaliseEmail(data.email);
  if (isUndeliverableEmail(email)) return fail(400, "reserved");

  try {
    const hour = 60 * 60;
    const [ipCount, emailCount] = await Promise.all([store().incr(`rl:magic:ip:${clientIp(req)}`, hour), store().incr(`rl:magic:email:${email}`, hour)]);
    if (ipCount > PER_IP_PER_HOUR || emailCount > PER_EMAIL_PER_HOUR) return fail(429, "rate");

    const { token, code } = await createMagicToken(email, { next, intent });
    await sendEmail(await magicLinkEmail({ to: email, code, url: `${deploymentUrl()}/login/verify?token=${encodeURIComponent(token)}` }));
  } catch (error) {
    captureException(error, { stage: "api.auth.request" });
    return fail(500, "send");
  }
  return isForm ? seeOther("/login/check-email") : Response.json({ ok: true });
}

function safeJson(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
}
