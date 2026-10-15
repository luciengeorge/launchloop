import "server-only";
import type { Session } from "./auth";
import type { Kit } from "./schema";
import { store } from "./store";

const key = (kitId: string) => `kitprogress:${kitId}`;

export const isOwner = (kit: Kit, session: Session | null) => !!session && !!kit.ownerEmail && kit.ownerEmail === session.email;

export async function getProgress(kitId: string): Promise<string[]> {
  return (await store().get<string[]>(key(kitId))) ?? [];
}

export async function setTaskDone(kitId: string, taskId: string, done: boolean): Promise<string[]> {
  const current = new Set(await getProgress(kitId));
  if (done) current.add(taskId);
  else current.delete(taskId);
  const next = [...current].slice(0, 200);
  await store().set(key(kitId), next);
  return next;
}
