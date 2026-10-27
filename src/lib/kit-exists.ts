import "server-only";
import { store } from "./store";

/**
 * Kit keys and existence checks without the rest of kits.ts (ingest, generation), so proxy.ts can tell a missing kit
 * from a real one before a page streams its 200 shell.
 */
export const isValidKitId = (id: string) => /^[A-Za-z0-9_-]{16,32}$/.test(id);
export const kitKey = (id: string) => `kit:${id}`;
export const pendingKitKey = (id: string) => `kitpending:${id}`;

export async function kitExists(id: string): Promise<boolean> {
  return isValidKitId(id) && store().exists(kitKey(id));
}

/** /kit/[id] also has something to show for a preview that is still generating, or failed, before it was saved. */
export async function kitPageExists(id: string): Promise<boolean> {
  if (!isValidKitId(id)) return false;
  const [kit, pending] = await Promise.all([store().exists(kitKey(id)), store().exists(pendingKitKey(id))]);
  return kit || pending;
}
