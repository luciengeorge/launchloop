import "server-only";
import { KIT_SECTIONS, generateKitSection } from "./copy";
import type { Kit, KitContent, KitSection } from "./schema";
import { store } from "./store";

/**
 * Full-kit content is generated speculatively as soon as the free preview
 * exists, one key per section so parallel writers never clobber each other.
 * Drafts are only ever rendered for paid kits; unpaid pages get placeholders.
 */
const DRAFT_TTL_SECONDS = 60 * 60 * 24 * 30;
/** A run with no progress for this long is treated as dead and restarted. */
const STALE_MS = 100_000;

const metaKey = (id: string) => `kitdraft:${id}:meta`;
const sectionKey = (id: string, s: KitSection) => `kitdraft:${id}:${s}`;

export interface DraftMeta {
  startedAt: string;
  finishedAt?: string;
  provider?: string;
  /** Milliseconds per section, for profiling. */
  timings: Partial<Record<KitSection, number>>;
  failed?: KitSection[];
}

export interface Draft {
  meta: DraftMeta | null;
  sections: Partial<KitContent>;
  complete: boolean;
}

export async function getDraft(id: string): Promise<Draft> {
  const [meta, ...values] = await Promise.all([store().get<DraftMeta>(metaKey(id)), ...KIT_SECTIONS.map((s) => store().get<Partial<KitContent>>(sectionKey(id, s)))]);
  const sections: Partial<KitContent> = Object.assign({}, ...values.filter(Boolean));
  return { meta, sections, complete: KIT_SECTIONS.every((s) => sections[s] !== undefined) };
}

export const assemble = (sections: Partial<KitContent>): KitContent | null => (KIT_SECTIONS.every((s) => sections[s] !== undefined) ? (sections as KitContent) : null);

const isRunning = (meta: DraftMeta | null) => !!meta && !meta.finishedAt && Date.now() - Date.parse(meta.startedAt) < STALE_MS;

const inFlight = new Map<string, Promise<Draft>>();

/** Generates every missing section in parallel. Idempotent; concurrent calls in one instance share a run. */
export function generateDraft(kit: Kit): Promise<Draft> {
  const running = inFlight.get(kit.id);
  if (running) return running;
  const job = runDraft(kit).finally(() => inFlight.delete(kit.id));
  inFlight.set(kit.id, job);
  return job;
}

async function runDraft(kit: Kit): Promise<Draft> {
  let draft = await getDraft(kit.id);
  if (draft.complete) return draft;
  // Another instance is already on it (e.g. the speculative run): wait for it rather than paying twice.
  if (isRunning(draft.meta)) {
    draft = await waitForDraft(kit.id);
    if (draft.complete) return draft;
  }

  const meta: DraftMeta = { startedAt: new Date().toISOString(), timings: {} };
  await store().set(metaKey(kit.id), meta, DRAFT_TTL_SECONDS);
  const missing = KIT_SECTIONS.filter((s) => draft.sections[s] === undefined);
  const providers: string[] = [];
  const results = await Promise.allSettled(
    missing.map(async (section) => {
      const t0 = Date.now();
      const { content, provider } = await generateKitSection(section, kit.brief, kit.preview, kit.digest);
      meta.timings[section] = Date.now() - t0;
      providers.push(provider);
      await store().set(sectionKey(kit.id, section), content, DRAFT_TTL_SECONDS);
    }),
  );
  const failed = missing.filter((_, i) => results[i].status === "rejected");
  await store().set<DraftMeta>(metaKey(kit.id), { ...meta, finishedAt: new Date().toISOString(), provider: providers[0], failed: failed.length ? failed : undefined }, DRAFT_TTL_SECONDS);
  const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (firstError) throw firstError.reason;
  return getDraft(kit.id);
}

/** Polls until a draft in progress elsewhere finishes or goes stale. */
async function waitForDraft(id: string): Promise<Draft> {
  for (;;) {
    await new Promise((r) => setTimeout(r, 700));
    const draft = await getDraft(id);
    if (draft.complete || !isRunning(draft.meta)) return draft;
  }
}
