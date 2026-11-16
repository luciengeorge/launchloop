import path from "node:path";
import { directoryRecord, parseDirectories } from "./directory-csv.ts";
import type { KeyValueStore, StoreWrite } from "./store.ts";

/**
 * The full Directory Launch Pack in Redis: one hash per directory and a sorted set of ranks. No server-only, and explicit
 * extensions, so scripts/seed-directory-pack.ts can run this under plain Node. The store() prefix (by VERCEL_ENV) comes first.
 */
export const DIRECTORY_KEY_PREFIX = "dirpack:v1:";
export const DIRECTORY_INDEX_KEY = `${DIRECTORY_KEY_PREFIX}index`;
export const directoryRowKey = (rank: number | string) => `${DIRECTORY_KEY_PREFIX}row:${rank}`;

/** Every directory's fields in rank order, unvalidated. Empty when nothing has been seeded. */
export async function readDirectoryRecords(store: KeyValueStore): Promise<Record<string, string>[]> {
  const ranks = await store.zRange(DIRECTORY_INDEX_KEY);
  if (!ranks.length) return [];
  const records = await store.hGetAllMany(ranks.map(directoryRowKey));
  return records.map((record, i) => record ?? { rank: ranks[i] });
}

export interface SeedOptions {
  write: boolean;
  store: () => KeyValueStore;
  /** Counts only: never a directory's data. */
  print: (line: string) => void;
}

export const SEED_ENVS = ["production", "preview", "development"] as const;

/**
 * Why a --write must not run, or null. It names the environment it writes to (and that must be the one VERCEL_ENV selects,
 * so the key prefix is the expected one), and it never seeds from a file inside the repo: the full list stays out of git.
 */
export function seedWriteProblem({ target, detected, file, repoRoot }: { target: string | undefined; detected: string; file: string; repoRoot: string }): string | null {
  if (!target || !(SEED_ENVS as readonly string[]).includes(target)) return `--write needs --env ${SEED_ENVS.join("|")}.`;
  if (target !== detected) return `--env ${target} doesn't match this environment (${detected}, from VERCEL_ENV), whose keys it would write.`;
  const inside = path.relative(repoRoot, path.resolve(file));
  if (!inside.startsWith("..") && !path.isAbsolute(inside)) return "Refusing to seed from a file inside the repo: keep the full list outside git.";
  return null;
}

/** Validates the CSV, then (with `write`) replaces every dirpack:v1: key in one transaction, so a re-run is idempotent. */
export async function seedDirectoryPack(csv: string, { write, store, print }: SeedOptions): Promise<{ rows: number; written: number; deleted: number }> {
  const rows = parseDirectories(csv);
  if (!write) {
    print(`${rows.length} rows valid. Dry run: nothing written. Pass --write to replace ${DIRECTORY_KEY_PREFIX}*.`);
    return { rows: rows.length, written: 0, deleted: 0 };
  }
  const s = store();
  const existing = await s.zRange(DIRECTORY_INDEX_KEY);
  // The rows about to be written are deleted too, so a stray key (another type, or extra fields) can't fail or leak into an HSET.
  const stale = new Set([...existing, ...rows.map((row) => String(row.rank))]);
  const writes: StoreWrite[] = [
    ...[...stale].map((rank): StoreWrite => ({ op: "del", key: directoryRowKey(rank) })),
    { op: "del", key: DIRECTORY_INDEX_KEY },
    ...rows.flatMap((row): StoreWrite[] => [
      { op: "hset", key: directoryRowKey(row.rank), fields: directoryRecord(row) },
      { op: "zadd", key: DIRECTORY_INDEX_KEY, score: row.rank, member: String(row.rank) },
    ]),
  ];
  await s.transaction(writes);
  print(`${rows.length} rows valid. Deleted ${existing.length} old rows, wrote ${rows.length} rows and the index under ${DIRECTORY_KEY_PREFIX}.`);
  return { rows: rows.length, written: rows.length, deleted: existing.length };
}
