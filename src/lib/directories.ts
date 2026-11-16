import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { FREE_LIST_SIZE, freeDirectoryRow, parseDirectories, parseDirectoryRecords, type Directory, type FreeDirectoryRow } from "./directory-csv";
import { DIRECTORY_INDEX_KEY, readDirectoryRecords } from "./directory-redis";
import { env } from "./env";
import { captureExceptionThrottled, captureMessage } from "./observability";
import { store } from "./store";

/** The public free tier (ranks 1 to 20, notes blanked), committed. Read on the server only, and traced into the routes that read it (next.config.ts). */
export const DIRECTORIES_CSV = "data/directory-pack/directories.csv";

const byRank = (a: Directory, b: Directory) => a.rank - b.rank;

let committed: Directory[] | undefined;
const committedDirectories = () => (committed ??= parseDirectories(readFileSync(path.join(process.cwd(), env.directoryPackCsv ?? DIRECTORIES_CSV), "utf8")).sort(byRank));

type Unavailable = "index_empty" | "redis_unreachable";

/** Redis has no list for buyers. Paid pages show "temporarily unavailable" and the pack APIs answer 503: never the committed 20. */
export class DirectoryPackUnavailableError extends Error {
  constructor(public readonly reason: Unavailable) {
    super(`Directory pack unavailable: ${reason}`);
    this.name = "DirectoryPackUnavailableError";
  }
}

/** What the pack APIs send while the list is unavailable. */
export const PACK_UNAVAILABLE_RETRY_SECONDS = 120;
export const packUnavailableResponse = () =>
  Response.json(
    { error: "The directory list is temporarily unavailable. We're on it: try again in a few minutes.", code: "pack_unavailable" },
    { status: 503, headers: { "Retry-After": String(PACK_UNAVAILABLE_RETRY_SECONDS) } },
  );

function unavailable(reason: Unavailable, error?: unknown): Directory[] {
  if (env.directoryPackLocalFallback) {
    const rows = committedDirectories();
    captureMessage("Directory pack: no rows from Redis, serving the committed top 20 (local dev and e2e only)", { reason, rows: rows.length });
    return rows;
  }
  const failure = new DirectoryPackUnavailableError(reason);
  captureExceptionThrottled(`directoryPack.unavailable:${reason}`, error ?? failure, { stage: "directories.load", reason });
  throw failure;
}

/**
 * Every row, sorted by rank, from Redis (seeded by scripts/seed-directory-pack.ts) and checked by the CSV schema. Only for
 * buyers who have unlocked the pack. Nothing seeded, or Redis unreachable: DirectoryPackUnavailableError, reported to
 * Sentry (the committed top 20 instead only in local dev and e2e). A malformed row in Redis throws rather than being served.
 */
export async function allDirectories(): Promise<Directory[]> {
  let records: Record<string, string>[];
  try {
    records = await readDirectoryRecords(store());
  } catch (error) {
    return unavailable("redis_unreachable", error);
  }
  if (!records.length) return unavailable("index_empty");
  return parseDirectoryRecords(records).sort(byRank);
}

/** allDirectories(), or null while the list is unavailable, for the paid page and APIs to say so. */
export async function availableDirectories(): Promise<Directory[] | null> {
  try {
    return await allDirectories();
  } catch (error) {
    if (error instanceof DirectoryPackUnavailableError) return null;
    throw error;
  }
}

/** How many directories Redis holds, or null when it has none or can't be read. Never throws. */
export async function redisDirectoryCount(): Promise<number | null> {
  try {
    return (await store().zCard(DIRECTORY_INDEX_KEY)) || null;
  } catch {
    return null;
  }
}

/** The public top 20, always from the committed file (never Redis), reduced to the free page's columns before anything renders it. */
export const freeDirectories = (): FreeDirectoryRow[] => committedDirectories().slice(0, FREE_LIST_SIZE).map(freeDirectoryRow);
