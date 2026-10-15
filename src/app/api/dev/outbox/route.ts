import { connection } from "next/server";
import type { OutboxEntry } from "@/lib/email";
import { isEmailMock } from "@/lib/env";
import { store } from "@/lib/store";

/** Mock-mode only: lists emails that would have been sent through Resend. */
export async function GET() {
  await connection();
  if (!isEmailMock()) return Response.json({ error: "Not found" }, { status: 404 });
  const outbox = (await store().get<OutboxEntry[]>("outbox")) ?? [];
  return Response.json({ emails: outbox }, { headers: { "Cache-Control": "no-store" } });
}
