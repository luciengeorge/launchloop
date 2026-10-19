import { addContact, isEmail, isUndeliverableEmail } from "@/lib/audience";
import { RESERVED_EMAIL_ERROR } from "@/lib/login-errors";
import { captureException } from "@/lib/observability";
import { readBody } from "@/lib/form-body";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { store } from "@/lib/store";
import { WAITLIST_MEMBERS_KEY, WAITLIST_TAG, isWaitlistSource, type WaitlistResponse } from "@/lib/waitlist";

export async function POST(req: Request) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, 10, 60 * 60 * 1000).ok) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const { data, isForm } = await readBody(req);
  const { email, plan, source } = data;
  if (!isEmail(email)) return isForm ? Response.redirect(new URL("/ship-loop?joined=0#waitlist", req.url), 303) : Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (isUndeliverableEmail(email)) return isForm ? Response.redirect(new URL("/ship-loop?joined=0#waitlist", req.url), 303) : Response.json({ error: RESERVED_EMAIL_ERROR }, { status: 400 });
  try {
    const { existing } = await addContact(email, "waitlist", {
      tag: WAITLIST_TAG,
      signup_source: isWaitlistSource(source) ? source : "ship_loop_page",
      ...(plan === "monthly" || plan === "yearly" ? { plan } : {}),
    });
    await store().sAdd(WAITLIST_MEMBERS_KEY, email.trim().toLowerCase());
    if (isForm) return Response.redirect(new URL(`/ship-loop?joined=${existing ? "dup" : "1"}#waitlist`, req.url), 303);
    return Response.json({ ok: true, duplicate: existing } satisfies WaitlistResponse);
  } catch (error) {
    captureException(error, { stage: "api.waitlist" });
    return Response.json({ error: "Couldn't add you right now. Please try again." }, { status: 500 });
  }
}
