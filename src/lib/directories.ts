import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { get } from "@vercel/blob";
import { cacheLife } from "next/cache";
import { FREE_LIST_SIZE, freeDirectoryRow, parseDirectories, type Directory, type FreeDirectoryRow } from "./directory-csv";
import { env } from "./env";

/** The public free tier (ranks 1 to 20), committed. Read on the server only, and traced into the functions that need it (next.config.ts). */
export const DIRECTORIES_CSV = "data/directory-pack/directories.csv";

const byRank = (a: Directory, b: Directory) => a.rank - b.rank;

let committed: Directory[] | undefined;
const committedDirectories = () => (committed ??= parseDirectories(readFileSync(path.join(process.cwd(), DIRECTORIES_CSV), "utf8")).sort(byRank));

/** The full database from the private blob, kept in Next's server cache. A failed read throws and isn't cached. */
async function privateCsv(url: string): Promise<string> {
  "use cache";
  cacheLife("hours");
  const result = await get(url, { access: "private" });
  if (result?.statusCode !== 200) throw new Error(`Directory pack blob not readable (${result ? result.statusCode : "not found"})`);
  return new Response(result.stream).text();
}

/**
 * Every row, sorted by rank: the private blob's when DIRECTORY_PACK_BLOB_URL is set, else the committed file. Only for buyers
 * who have unlocked the pack. With the blob set, any failure (fetch, missing blob, bad CSV) throws: never the committed rows instead.
 */
export async function allDirectories(): Promise<Directory[]> {
  if (!env.directoryPackBlobUrl) return committedDirectories();
  return parseDirectories(await privateCsv(env.directoryPackBlobUrl)).sort(byRank);
}

export const directoryCount = async () => (await allDirectories()).length;

/** The public top 20, always from the committed file, reduced to the free page's columns before anything renders it. */
export const freeDirectories = (): FreeDirectoryRow[] => committedDirectories().slice(0, FREE_LIST_SIZE).map(freeDirectoryRow);
