/**
 * Seeds the full Directory Launch Pack into Redis (dirpack:v1:*) from a CSV, after checking it against the schema.
 *
 *   npm run seed:directory-pack -- <path/to/directories.csv>          # dry run: validates and prints counts
 *   npm run seed:directory-pack -- <path/to/directories.csv> --write  # replaces every dirpack:v1: key in one transaction
 *
 * Writes to the Redis that KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)
 * point at, under the key prefix VERCEL_ENV selects (production: none, preview: "preview:", otherwise "dev:").
 * Prints counts only, never a directory's data.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { deployEnv } from "../src/lib/deploy-env.ts";
import { seedDirectoryPack } from "../src/lib/directory-redis.ts";
import { env } from "../src/lib/env.ts";
import { store } from "../src/lib/store.ts";

const { positionals, values } = parseArgs({ allowPositionals: true, options: { write: { type: "boolean", default: false } } });
const [file] = positionals;
if (!file) {
  console.error("Usage: npm run seed:directory-pack -- <path/to/directories.csv> [--write]");
  process.exit(2);
}
// Without a Redis URL, store() is the local file store: a --write there would look like a seed and change nothing that serves buyers.
if (values.write && !(env.kvUrl && env.kvToken)) {
  console.error("--write needs KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN).");
  process.exit(2);
}
console.log(`Target: ${deployEnv()} keys${values.write ? "" : " (dry run)"}`);
await seedDirectoryPack(readFileSync(file, "utf8"), { write: values.write, store, print: (line) => console.log(line) });
