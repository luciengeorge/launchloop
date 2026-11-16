/**
 * Seeds the full Directory Launch Pack into Redis (dirpack:v1:*) from a CSV, after checking it against the schema.
 *
 *   npm run seed:directory-pack -- <path/to/directories.csv>                                # dry run: validates, prints counts
 *   npm run seed:directory-pack -- <path/to/directories.csv> --write --env production      # replaces every dirpack:v1: key
 *
 * Writes to the Redis that KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)
 * point at, under the key prefix VERCEL_ENV selects (production: none, preview: "preview:", otherwise "dev:"); --env must
 * name that same environment. A --write never reads a file inside the repo. Prints counts only, never a directory's data.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { deployEnv } from "../src/lib/deploy-env.ts";
import { DirectoryCsvError } from "../src/lib/directory-csv.ts";
import { seedDirectoryPack, seedWriteProblem } from "../src/lib/directory-redis.ts";
import { env } from "../src/lib/env.ts";
import { store } from "../src/lib/store.ts";

const { positionals, values } = parseArgs({ allowPositionals: true, options: { write: { type: "boolean", default: false }, env: { type: "string" } } });
const [file] = positionals;
function fail(message: string): never {
  console.error(message);
  process.exit(2);
}
if (!file) fail("Usage: npm run seed:directory-pack -- <path/to/directories.csv> [--write --env production|preview|development]");
const detected = deployEnv();
if (values.write) {
  // Without a Redis URL, store() is the local file store: a --write there would look like a seed and change nothing that serves buyers.
  if (!(env.kvUrl && env.kvToken)) fail("--write needs KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN).");
  const problem = seedWriteProblem({ target: values.env, detected, file, repoRoot: path.resolve(import.meta.dirname, "..") });
  if (problem) fail(problem);
}
console.log(`Target: ${detected} keys on ${env.kvUrl ? new URL(env.kvUrl).host : "no Redis configured"}${values.write ? "" : " (dry run)"}`);
try {
  await seedDirectoryPack(readFileSync(file, "utf8"), { write: values.write, store, print: (line) => console.log(line) });
} catch (error) {
  if (!(error instanceof DirectoryCsvError)) throw error;
  fail(`Invalid CSV, nothing written:\n${error.issues.join("\n")}`);
}
