import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_HINT_COOKIE, seeOther } from "@/lib/auth";

export async function POST() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(SESSION_HINT_COOKIE);
  return seeOther("/");
}
