import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { FREE_LIST_SIZE, freeDirectoryRow, parseDirectories, type Directory, type FreeDirectoryRow } from "./directory-csv";

/** Paid data: read on the server only, and traced into the functions that need it (next.config.ts). */
export const DIRECTORIES_CSV = "data/directory-pack/directories.csv";

let cached: Directory[] | undefined;

/** Every row, sorted by rank. Only for buyers who have unlocked the pack. */
export function allDirectories(): Directory[] {
  cached ??= parseDirectories(readFileSync(path.join(process.cwd(), DIRECTORIES_CSV), "utf8")).sort((a, b) => a.rank - b.rank);
  return cached;
}

export const directoryCount = () => allDirectories().length;

/** The public top 20, reduced to the free page's columns before anything renders it. */
export const freeDirectories = (): FreeDirectoryRow[] => allDirectories().slice(0, FREE_LIST_SIZE).map(freeDirectoryRow);
