import { isEmail } from "@/lib/audience";
import { createMagicToken, safeNext, seeOther } from "@/lib/auth";
import { magicLinkEmail, sendEmail } from "@/lib/email";
import { deploymentUrl } from "@/lib/env";
import { readBody } from "@/lib/form-body";
import { normaliseEmail } from "@/lib/kits";
import { captureException } from "@/lib/observability";
import { clientIp } from "@/lib/rate-limit";
import { store } from "@/lib/store";

const PER_IP_PER_HOUR = Number(process.env.MAGIC_LINK_RATE_LIMIT_PER_IP ?? 10);
const PER_EMAIL_PER_HOUR = Number(process.env.MAGIC_LINK_RATE_LIMIT_PER_EMAIL ?? 5);

/** Sends a magic login link. Rate limited per IP and per email (shared via the store, so it holds across instances). */
export async function POST(req: Request) {
  const { data, isForm } = await readBody(req);
  const next = safeNext(data.next);
  const fail = (status: number, error: string, code: string) =>
    isForm ? seeOther(`/login?error=${code}${next ? `&next=${encodeURIComponent(next)}` : ""}`) : Response.json({ error }, { status });

  if (!isEmail(data.email)) return fail(400, "Enter a valid email address.", "invalid");
  const email = normaliseEmail(data.email);

  try {
    const hour = 60 * 60;
    const [ipCount, emailCount] = await Promise.all([store().incr(`rl:magic:ip:${clientIp(req)}`, hour), store().incr(`rl:magic:email:${email}`, hour)]);
    if (ipCount > PER_IP_PER_HOUR || emailCount > PER_EMAIL_PER_HOUR) return fail(429, "Too many login links requested. Try again in an hour.", "rate");

    const token = await createMagicToken(email, next);
    await sendEmail(magicLinkEmail({ to: email, url: `${deploymentUrl()}/login/verify?token=${encodeURIComponent(token)}` }));
  } catch (error) {
    captureException(error, { stage: "api.auth.request" });
    return fail(500, "Couldn't send your login link. Please try again.", "send");
  }
  return isForm ? seeOther("/login/check-email") : Response.json({ ok: true });
}
