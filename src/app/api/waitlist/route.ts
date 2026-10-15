import { addContact, isEmail } from "@/lib/audience";
import { captureException } from "@/lib/observability";
import { readBody } from "@/lib/form-body";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, 10, 60 * 60 * 1000).ok) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const { data, isForm } = await readBody(req);
  const { email, plan } = data;
  if (!isEmail(email)) return isForm ? Response.redirect(new URL("/ship-loop?joined=0", req.url), 303) : Response.json({ error: "Enter a valid email address." }, { status: 400 });
  try {
    await addContact(email, "waitlist", { plan: plan === "yearly" ? "yearly" : "monthly" });
    return isForm ? Response.redirect(new URL("/ship-loop?joined=1", req.url), 303) : Response.json({ ok: true });
  } catch (error) {
    captureException(error, { stage: "api.waitlist" });
    return Response.json({ error: "Couldn't add you right now. Please try again." }, { status: 500 });
  }
}
