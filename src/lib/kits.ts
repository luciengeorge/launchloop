import "server-only";
import { randomBytes } from "node:crypto";
import { buildBrief, sourceDigest } from "./brief";
import { generatePreview } from "./copy";
import type { Attribution } from "./attribution";
import type { KitErrorBody } from "./errors";
import { ingest } from "./ingest";
import { phase } from "./kit-tracing";
import type { Brief, Kit } from "./schema";
import { copyDraft } from "./generation";
import { store } from "./store";

/** The privacy page promises this: unpaid previews go 30 days after they were made, paid kits stay until the buyer asks us to delete them. */
const PREVIEW_TTL_SECONDS = 60 * 60 * 24 * 30;
const key = (id: string) => `kit:${id}`;

function kitTtlSeconds(kit: Kit): number | undefined {
  if (kit.paid) return undefined;
  const ageSeconds = Math.floor((Date.now() - Date.parse(kit.createdAt)) / 1000);
  return Number.isFinite(ageSeconds) ? Math.max(60, PREVIEW_TTL_SECONDS - ageSeconds) : PREVIEW_TTL_SECONDS;
}

export const newId = () => randomBytes(16).toString("base64url");
export const isValidKitId = (id: string) => /^[A-Za-z0-9_-]{16,32}$/.test(id);

export async function getKit(id: string): Promise<Kit | null> {
  if (!isValidKitId(id)) return null;
  return store().get<Kit>(key(id));
}

export async function saveKit(kit: Kit): Promise<void> {
  await phase("db.kit.save", "db", { "kit.paid": kit.paid }, () => store().set(key(kit.id), kit, kitTtlSeconds(kit)));
}

export async function updateKit(id: string, patch: Partial<Kit> | ((kit: Kit) => Partial<Kit>)): Promise<Kit> {
  const kit = await getKit(id);
  if (!kit) throw new Error(`Kit ${id} not found`);
  const next = { ...kit, ...(typeof patch === "function" ? patch(kit) : patch) };
  await saveKit(next);
  return next;
}

/**
 * A streamed preview the client was told about ({type:"accepted"}) but that isn't saved yet,
 * so /kit/[id] can wait for it if the stream drops instead of showing not-found.
 */
export type PendingKit = { state: "generating" } | ({ state: "failed" } & KitErrorBody);

const PENDING_TTL_SECONDS = 10 * 60;
/** Past the route's maxDuration plus slack, a preview still marked generating has died with its function. */
const PENDING_STALE_MS = 90_000;
const pendingKey = (id: string) => `kitpending:${id}`;

export async function markKitPending(id: string): Promise<void> {
  await store().set(pendingKey(id), { state: "generating", startedAt: Date.now() }, PENDING_TTL_SECONDS);
}

export async function markKitFailed(id: string, body: KitErrorBody): Promise<void> {
  await store().set(pendingKey(id), { state: "failed", ...body }, PENDING_TTL_SECONDS);
}

export async function getPendingKit(id: string): Promise<PendingKit | null> {
  if (!isValidKitId(id)) return null;
  const pending = await store().get<PendingKit & { startedAt?: number }>(pendingKey(id));
  if (!pending) return null;
  if (pending.state === "generating" && Date.now() - (pending.startedAt ?? 0) > PENDING_STALE_MS) {
    return { state: "failed", error: "Your preview stopped before it finished.", code: "unknown", fix: "Make a new preview. It usually takes under 30 seconds." };
  }
  if (pending.state === "failed") return { state: "failed", error: pending.error, code: pending.code, fix: pending.fix };
  return { state: "generating" };
}

/** Free step: ingest, brief and the watermarked preview. The paid kit is generated after checkout. */
export type KitStep = "repo" | "site" | "brief" | "copy";

export interface KitOptions {
  id?: string;
  ownerEmail?: string;
  attribution?: Attribution;
}

export async function createKit(
  input: string,
  onStep: (step: KitStep) => void = () => {},
  opts: KitOptions = {},
): Promise<Kit> {
  const source = await ingest(input, onStep);
  const fingerprint = source.source.fingerprint;
  const reused = fingerprint ? await reuseKit(fingerprint, opts) : null;
  if (reused) {
    onStep("brief");
    onStep("copy");
    return reused;
  }
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
    attribution: opts.attribution,
  };
  await saveKit(kit);
  if (opts.ownerEmail) await linkKitToUser(opts.ownerEmail, kit.id);
  if (fingerprint) await store().set(dedupeKey(fingerprint), kit.id, DEDUPE_TTL_SECONDS);
  return kit;
}

const DEDUPE_TTL_SECONDS = 24 * 60 * 60;
const dedupeKey = (fingerprint: string) => `dedupe:${fingerprint}`;

/**
 * The free preview's ingest and brief steps without saving a kit, for the free
 * tools. A kit made from the same repo state in the last 24 hours lends its brief.
 */
export async function briefFor(input: string): Promise<Brief> {
  const source = await ingest(input);
  const fingerprint = source.source.fingerprint;
  const recentId = fingerprint ? await store().get<string>(dedupeKey(fingerprint)) : null;
  const recent = recentId ? await getKit(recentId) : null;
  if (recent) return recent.brief;
  return (await buildBrief(source)).brief;
}

/**
 * Same repo at the same commit within 24 hours: reuse the brief, preview and
 * any full-kit draft, but as a fresh kit so ownership and payment stay separate.
 */
async function reuseKit(fingerprint: string, opts: KitOptions): Promise<Kit | null> {
  const sourceId = await store().get<string>(dedupeKey(fingerprint));
  const source = sourceId ? await getKit(sourceId) : null;
  if (!source) return null;
  const kit: Kit = {
    id: opts.id ?? newId(),
    createdAt: new Date().toISOString(),
    status: "preview",
    source: source.source,
    brief: source.brief,
    palette: source.palette,
    preview: source.preview,
    digest: source.digest,
    llm: source.llm,
    paid: false,
    attempts: 0,
    ownerEmail: opts.ownerEmail,
    reusedFrom: source.id,
    attribution: opts.attribution,
  };
  await saveKit(kit);
  await copyDraft(source.id, kit.id);
  if (opts.ownerEmail) await linkKitToUser(opts.ownerEmail, kit.id);
  return kit;
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
const userKitsKey = (email: string) => `user:${normaliseEmail(email)}:kits`;
/** Paid kits bought as a guest by an email that has no account yet, claimed on its first login (see accounts.ts). */
const pendingKitsKey = (email: string) => `pending:${normaliseEmail(email)}:kits`;

/** Adds a kit to an account's index. Idempotent. */
export async function linkKitToUser(email: string, kitId: string): Promise<void> {
  await store().sAdd(userKitsKey(email), kitId);
}

export const listLinkedKitIds = (email: string) => store().sMembers(userKitsKey(email));
export const addPendingKit = (email: string, kitId: string) => store().sAdd(pendingKitsKey(email), kitId);
export const removePendingKit = (email: string, kitId: string) => store().sRem(pendingKitsKey(email), kitId);
export const listPendingKitIds = (email: string) => store().sMembers(pendingKitsKey(email));

/**
 * Kits a signed-in email can open: its index plus any guest purchases not claimed yet. Only called with a
 * session's (verified) email, so a purchase is visible even before the login that claims it.
 */
export async function listUserKitIds(email: string): Promise<string[]> {
  const [linked, pending] = await Promise.all([listLinkedKitIds(email), listPendingKitIds(email)]);
  return [...new Set([...linked, ...pending])];
}

export async function listUserKits(email: string): Promise<Kit[]> {
  const ids = await listUserKitIds(email);
  const kits = await Promise.all(ids.map((id) => getKit(id)));
  return kits.filter((k): k is Kit => !!k).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const RECENT_PREVIEW_MS = 24 * 60 * 60 * 1000;

/**
 * The newest unpaid preview from the last day that this visitor made: from the anonymous-kits cookie
 * (newest last) or, signed in, their account. For the free-preview limit's "Unlock my kit" button.
 */
export async function latestUnpaidKitId(anonIds: string[], email?: string): Promise<string | null> {
  const [anon, owned] = await Promise.all([Promise.all(anonIds.slice(-5).map(getKit)), email ? listUserKits(email) : []]);
  const since = Date.now() - RECENT_PREVIEW_MS;
  const recent = [...anon, ...owned].filter((k): k is Kit => !!k && !k.paid && Date.parse(k.createdAt) >= since);
  return recent.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.id ?? null;
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
