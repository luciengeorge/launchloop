import { isEmail } from "@/lib/audience";
import { consumeLoginCode, consumeMagicToken, seeOther } from "@/lib/auth";
import { readBody } from "@/lib/form-body";
import { completeLogin } from "@/lib/login";

/**
 * Consumes a magic-link token or a 6-digit code. POST only, so link scanners that
 * prefetch the GET page can't burn the token. Form posts get a 303 to the
 * destination; JSON calls (code entry) get `{ next }`.
 */
export async function POST(req: Request) {
  const { data, isForm } = await readBody(req);

  if (typeof data.code === "string" || typeof data.code === "number") {
    const result = isEmail(data.email) ? await consumeLoginCode(data.email, String(data.code).replace(/\s/g, "")) : null;
    if (result === "too_many") return isForm ? seeOther("/login?error=code") : Response.json({ error: "Too many wrong codes. Use the link in the email, or request a new code.", code: "too_many" }, { status: 429 });
    if (!result) return isForm ? seeOther("/login?error=code") : Response.json({ error: "That code isn't right or has expired. Check the latest email.", code: "invalid_code" }, { status: 400 });
    const next = await completeLogin(result);
    return isForm ? seeOther(next) : Response.json({ next });
  }

  const record = typeof data.token === "string" ? await consumeMagicToken(data.token) : null;
  if (!record) return isForm ? seeOther("/login?error=expired") : Response.json({ error: "That login link has expired." }, { status: 400 });
  const next = await completeLogin(record);
  return isForm ? seeOther(next) : Response.json({ next });
}
