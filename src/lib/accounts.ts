import "server-only";
import { addPendingKit, getKit, linkKitToUser, listLinkedKitIds, listPendingKitIds, normaliseEmail, removePendingKit, updateKit } from "./kits";
import { store } from "./store";

/**
 * Accounts are emails that have logged in with a magic link. Guest checkout collects an unverified email,
 * so a purchase only goes straight into an existing account; otherwise it waits under the email until
 * that address logs in.
 */
export interface AccountRecord {
  firstLoginAt: string;
  lastLoginAt: string;
}

const accountKey = (email: string) => `user:${normaliseEmail(email)}:account`;

/** Where a paid kit went. "none": the session had no email to link it to. */
export type KitOwnership = "account" | "pending" | "none";

export async function recordLogin(email: string): Promise<void> {
  const now = new Date().toISOString();
  const existing = await store().get<AccountRecord>(accountKey(email));
  await store().set<AccountRecord>(accountKey(email), { firstLoginAt: existing?.firstLoginAt ?? now, lastLoginAt: now });
}

/** Accounts from before login records existed are recognised by their kit index, which only verified emails get. */
export async function accountExists(email: string): Promise<boolean> {
  if (await store().get<AccountRecord>(accountKey(email))) return true;
  return (await listLinkedKitIds(email)).length > 0;
}

/** Links a paid kit to the buyer's account, or records it as pending for their email. Idempotent. */
export async function assignPaidKit(email: string, kitId: string): Promise<KitOwnership> {
  if (await accountExists(email)) {
    await linkKitToUser(email, kitId);
    return "account";
  }
  await addPendingKit(email, kitId);
  // A first login can land between the check and the write. Login records the account before claiming, so look again.
  if (await accountExists(email)) {
    await claimPendingKits(email);
    return "account";
  }
  return "pending";
}

/** Moves an email's pending purchases into its account. Called on login; safe to repeat or run concurrently. */
export async function claimPendingKits(email: string): Promise<string[]> {
  const owner = normaliseEmail(email);
  const claimed: string[] = [];
  for (const id of await listPendingKitIds(owner)) {
    const kit = await getKit(id);
    if (kit) {
      if (!kit.ownerEmail) await updateKit(id, { ownerEmail: owner });
      await linkKitToUser(owner, id);
      claimed.push(id);
    }
    await removePendingKit(owner, id);
  }
  return claimed;
}
