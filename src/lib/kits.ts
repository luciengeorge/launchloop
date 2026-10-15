import "server-only";
import { randomBytes } from "node:crypto";
import { buildBrief, sourceDigest } from "./brief";
import { generatePreview } from "./copy";
import { ingest } from "./ingest";
import type { Kit } from "./schema";
import { store } from "./store";

const KIT_TTL_SECONDS = 60 * 60 * 24 * 365;
const key = (id: string) => `kit:${id}`;

export const newId = () => randomBytes(16).toString("base64url");
export const isValidKitId = (id: string) => /^[A-Za-z0-9_-]{16,32}$/.test(id);

export async function getKit(id: string): Promise<Kit | null> {
  if (!isValidKitId(id)) return null;
  return store().get<Kit>(key(id));
}

export async function saveKit(kit: Kit): Promise<void> {
  await store().set(key(kit.id), kit, KIT_TTL_SECONDS);
}

export async function updateKit(id: string, patch: Partial<Kit> | ((kit: Kit) => Partial<Kit>)): Promise<Kit> {
  const kit = await getKit(id);
  if (!kit) throw new Error(`Kit ${id} not found`);
  const next = { ...kit, ...(typeof patch === "function" ? patch(kit) : patch) };
  await saveKit(next);
  return next;
}

/** Free step: ingest, brief and the watermarked preview. The paid kit is generated after checkout. */
export type KitStep = "repo" | "site" | "brief" | "copy";

export async function createKit(
  input: string,
  onStep: (step: KitStep) => void = () => {},
  opts: { id?: string; ownerEmail?: string } = {},
): Promise<Kit> {
  const source = await ingest(input, onStep);
  onStep("brief");
  const { brief, provider } = await buildBrief(source);
  onStep("copy");
  const { preview } = await generatePreview(brief);
  const kit: Kit = {
    id: opts.id ?? newId(),
    ownerEmail: opts.ownerEmail,
    createdAt: new Date().toISOString(),
    status: "preview",
    source: source.source,
    brief,
    palette: source.palette,
    preview,
    digest: sourceDigest(source, 4000),
    llm: provider,
    paid: false,
    attempts: 0,
  };
  await saveKit(kit);
  if (opts.ownerEmail) await linkKitToUser(opts.ownerEmail, kit.id);
  return kit;
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
const userKitsKey = (email: string) => `user:${normaliseEmail(email)}:kits`;

/** Adds a kit to an account's index. Idempotent. */
export async function linkKitToUser(email: string, kitId: string): Promise<void> {
  await store().sAdd(userKitsKey(email), kitId);
}

export async function listUserKits(email: string): Promise<Kit[]> {
  const ids = await store().sMembers(userKitsKey(email));
  const kits = await Promise.all(ids.map((id) => getKit(id)));
  return kits.filter((k): k is Kit => !!k).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Claims anonymous kits made in this browser. Kits already owned by another account are skipped. */
export async function claimKits(email: string, kitIds: string[]): Promise<string[]> {
  const owner = normaliseEmail(email);
  const claimed: string[] = [];
  for (const id of kitIds.slice(0, 50)) {
    const kit = await getKit(id);
    if (!kit || (kit.ownerEmail && kit.ownerEmail !== owner)) continue;
    if (!kit.ownerEmail) await updateKit(id, { ownerEmail: owner });
    await linkKitToUser(owner, id);
    claimed.push(id);
  }
  return claimed;
}
