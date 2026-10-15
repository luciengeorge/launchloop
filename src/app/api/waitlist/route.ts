import { addContact, isEmail } from "@/lib/audience";
import { captureException } from "@/lib/observability";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, 10, 60 * 60 * 1000).ok) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const { email, plan } = (await req.json().catch(() => ({}))) as { email?: unknown; plan?: unknown };
  if (!isEmail(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  try {
    await addContact(email, "waitlist", { plan: plan === "yearly" ? "yearly" : "monthly" });
    return Response.json({ ok: true });
  } catch (error) {
    captureException(error, { stage: "api.waitlist" });
    return Response.json({ error: "Couldn't add you right now. Please try again." }, { status: 500 });
  }
}
