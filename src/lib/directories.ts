import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { FREE_LIST_SIZE, freeDirectoryRow, parseDirectories, parseDirectoryRecords, type Directory, type FreeDirectoryRow } from "./directory-csv";
import { DIRECTORY_INDEX_KEY, readDirectoryRecords } from "./directory-redis";
import { env } from "./env";
import { captureMessage } from "./observability";
import { store } from "./store";

/** The public free tier (ranks 1 to 20, notes blanked), committed. Read on the server only, and traced into the routes that read it (next.config.ts). */
export const DIRECTORIES_CSV = "data/directory-pack/directories.csv";

const byRank = (a: Directory, b: Directory) => a.rank - b.rank;

let committed: Directory[] | undefined;
const committedDirectories = () => (committed ??= parseDirectories(readFileSync(path.join(process.cwd(), env.directoryPackCsv ?? DIRECTORIES_CSV), "utf8")).sort(byRank));

function committedFallback(reason: "index_empty" | "redis_unreachable", error?: unknown): Directory[] {
  const rows = committedDirectories();
  captureMessage("Directory pack: no rows from Redis, serving the committed top 20 instead of the full list", {
    reason,
    rows: rows.length,
    ...(error ? { error: error instanceof Error ? error.message : String(error) } : {}),
  });
  return rows;
}

/**
 * Every row, sorted by rank, from Redis (seeded by scripts/seed-directory-pack.ts) and checked by the CSV schema. Only for
 * buyers who have unlocked the pack. Nothing seeded, or Redis unreachable: the committed top 20, flagged in the logs. A
 * malformed row in Redis throws rather than being served.
 */
export async function allDirectories(): Promise<Directory[]> {
  let records: Record<string, string>[];
  try {
    records = await readDirectoryRecords(store());
  } catch (error) {
    return committedFallback("redis_unreachable", error);
  }
  if (!records.length) return committedFallback("index_empty");
  return parseDirectoryRecords(records).sort(byRank);
}

/** How many directories Redis holds, or null when it has none or can't be read. Never throws. */
export async function redisDirectoryCount(): Promise<number | null> {
  try {
    return (await store().zRange(DIRECTORY_INDEX_KEY)).length || null;
  } catch {
    return null;
  }
}

/** The public top 20, always from the committed file (never Redis), reduced to the free page's columns before anything renders it. */
export const freeDirectories = (): FreeDirectoryRow[] => committedDirectories().slice(0, FREE_LIST_SIZE).map(freeDirectoryRow);
