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
export async function createKit(input: string): Promise<Kit> {
  const source = await ingest(input);
  const { brief, provider } = await buildBrief(source);
  const { preview } = await generatePreview(brief);
  const kit: Kit = {
    id: newId(),
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
  return kit;
}
