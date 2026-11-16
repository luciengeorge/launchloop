import { addContact, isEmail, isUndeliverableEmail } from "@/lib/audience";
import { RESERVED_EMAIL_ERROR } from "@/lib/login-errors";
import { captureException } from "@/lib/observability";
import { readBody } from "@/lib/form-body";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { store } from "@/lib/store";
import { WAITLIST_FOR, WAITLIST_RATE_LIMITED_ERROR, WAITLIST_SERVER_ERROR, isWaitlistSource, type WaitlistResponse } from "@/lib/waitlist";

export async function POST(req: Request) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, 10, 60 * 60 * 1000).ok) {
    return Response.json({ error: WAITLIST_RATE_LIMITED_ERROR }, { status: 429 });
  }
  const { data, isForm } = await readBody(req);
  const { email, plan } = data;
  const source = isWaitlistSource(data.source) ? data.source : "ship_loop_page";
  const list = WAITLIST_FOR[source];
  if (!isEmail(email)) return isForm ? Response.redirect(new URL(`${list.page}?joined=0#waitlist`, req.url), 303) : Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (isUndeliverableEmail(email)) return isForm ? Response.redirect(new URL(`${list.page}?joined=0#waitlist`, req.url), 303) : Response.json({ error: RESERVED_EMAIL_ERROR }, { status: 400 });
  try {
    const { existing } = await addContact(email, list.contactSource, {
      tag: list.tag,
      signup_source: source,
      ...(plan === "monthly" || plan === "yearly" ? { plan } : {}),
    });
    await store().sAdd(list.membersKey, email.trim().toLowerCase());
    if (isForm) return Response.redirect(new URL(`${list.page}?joined=${existing ? "dup" : "1"}#waitlist`, req.url), 303);
    return Response.json({ ok: true, duplicate: existing } satisfies WaitlistResponse);
  } catch (error) {
    captureException(error, { stage: "api.waitlist" });
    return Response.json({ error: WAITLIST_SERVER_ERROR }, { status: 500 });
  }
}
