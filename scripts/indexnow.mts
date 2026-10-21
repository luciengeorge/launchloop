/**
 * Pings IndexNow with the indexable URLs a production deploy changed. See docs/seo/indexnow.md.
 *
 *   npm run indexnow -- deploy --sha <sha> [--deployment-id <id>] [--environment <name>] [--wait <seconds>] [--dry-run]
 *   npm run indexnow -- urls "<url or path> ..." [--dry-run]
 *   npm run indexnow -- all [--dry-run]
 *
 * Only URLs listed in the live sitemap.xml that answer 200 are sent, plus deleted or renamed pages that now
 * answer 404 or 410. Network and IndexNow errors are logged as warnings and the script still exits 0.
 * A script or git error exits non-zero: the workflow's ping step is continue-on-error, so that failure shows
 * only inside the run.
 */
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { GUIDES } from "../src/lib/guides.ts";
import {
  absoluteUrl,
  diffPaths,
  INDEXNOW_ENDPOINT,
  INDEXNOW_MAX_URLS,
  INDEXNOW_ORIGIN,
  indexNowAccepted,
  indexNowBody,
  inSitemap,
  isGone,
  parseUrlList,
  sitemapPaths,
} from "../src/lib/indexnow.ts";

const USAGE = `Usage:
  npm run indexnow -- deploy --sha <sha> [--deployment-id <id>] [--environment <name>] [--wait <seconds>] [--dry-run]
  npm run indexnow -- urls "<url or path> ..." [--dry-run]
  npm run indexnow -- all [--dry-run]`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    sha: { type: "string" },
    "deployment-id": { type: "string" },
    environment: { type: "string", default: "Production" },
    wait: { type: "string", default: "0" },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

const warn = (message: string) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `warning: ${message}`);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();

type GitHubDeployment = { id: number; sha: string };
type GitHubStatus = { state: string };

async function github<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
  });
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status}`);
  return (await res.json()) as T;
}

/** The commit of the last successful deployment to the same environment before this one, from Vercel's GitHub deployments. */
async function previousProductionSha(sha: string, deploymentId: number | undefined, environment: string): Promise<string | undefined> {
  if (!process.env.GITHUB_REPOSITORY || !process.env.GITHUB_TOKEN) return undefined;
  const deployments = await github<GitHubDeployment[]>(`/deployments?environment=${encodeURIComponent(environment)}&per_page=30`);
  for (const d of deployments) {
    if (d.sha === sha || (deploymentId !== undefined && d.id >= deploymentId)) continue;
    // Older successful deployments get an "inactive" status on top of their "success" one, so search the history.
    const statuses = await github<GitHubStatus[]>(`/deployments/${d.id}/statuses?per_page=100`);
    if (statuses.some((s) => s.state === "success")) return d.sha;
  }
  return undefined;
}

/** `git diff --name-status` from the previous production commit, with renames as one "R" line (old, then new path). */
async function nameStatus(sha: string, deploymentId: number | undefined, environment: string): Promise<string> {
  let base: string | undefined;
  try {
    base = await previousProductionSha(sha, deploymentId, environment);
  } catch (error) {
    warn(`Couldn't read previous production deployment (${(error as Error).message}), diffing against the parent commit.`);
  }
  if (base) {
    try {
      git("merge-base", "--is-ancestor", base, sha);
    } catch {
      warn(`Previous production commit ${base} isn't an ancestor of ${sha}, diffing against the parent commit.`);
      base = undefined;
    }
  }
  base ??= `${sha}~1`;
  console.log(`Diffing ${base}..${sha}`);
  return git("diff", "--name-status", "--find-renames", base, sha);
}

async function liveSitemap(): Promise<string[]> {
  try {
    const res = await fetch(`${INDEXNOW_ORIGIN}/sitemap.xml`);
    if (res.ok) return sitemapPaths(await res.text());
    warn(`sitemap.xml answered ${res.status}`);
  } catch (error) {
    warn(`sitemap.xml request failed: ${(error as Error).message}`);
  }
  return [];
}

/** The status without following redirects, or 0 on a network error. Only exactly 200 counts as live. */
async function statusOf(path: string): Promise<number> {
  try {
    const res = await fetch(absoluteUrl(path), { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    await res.body?.cancel();
    return res.status;
  } catch {
    return 0;
  }
}

async function live(candidates: readonly string[]): Promise<{ ok: string[]; missing: string[] }> {
  const listed = inSitemap(candidates, await liveSitemap());
  const ok: string[] = [];
  for (let i = 0; i < listed.length; i += 8) {
    const batch = listed.slice(i, i + 8);
    const statuses = await Promise.all(batch.map(statusOf));
    ok.push(...batch.filter((_, j) => statuses[j] === 200));
  }
  const missing = candidates.filter((c) => !c.endsWith("/*") && !ok.includes(c));
  return { ok, missing };
}

/** Right after a deploy, a new page can take a moment to show up in the sitemap, so poll for a while. */
async function liveWithWait(candidates: readonly string[], waitSeconds: number) {
  const deadline = Date.now() + waitSeconds * 1000;
  let result = await live(candidates);
  while (result.missing.length && Date.now() < deadline) {
    console.log(`Not live yet: ${result.missing.join(", ")}. Retrying in 15s.`);
    await sleep(15_000);
    result = await live(candidates);
  }
  return result;
}

/** Deleted or renamed-away pages: sent as changed if still listed and live, as removed if they answer 404 or 410. */
async function checkRemoved(removed: readonly string[]): Promise<{ live: string[]; gone: string[] }> {
  if (!removed.length) return { live: [], gone: [] };
  const listed = new Set(await liveSitemap());
  const live: string[] = [];
  const gone: string[] = [];
  for (const path of removed) {
    const status = await statusOf(path);
    if (status === 200 && listed.has(path)) live.push(path);
    else if (isGone(status)) gone.push(path);
    else console.log(`Removed page ${path} answered ${status || "nothing"}, skipped.`);
  }
  if (gone.length) console.log(`Gone (404 or 410), sent as removals: ${gone.join(", ")}`);
  return { live, gone };
}

async function ping(paths: string[], dryRun: boolean) {
  if (!paths.length) {
    console.log("Nothing to ping.");
    return;
  }
  if (paths.length > INDEXNOW_MAX_URLS) warn(`${paths.length} URLs, sending the first ${INDEXNOW_MAX_URLS}.`);
  const body = indexNowBody(paths);
  console.log(`URLs (${body.urlList.length}):\n  ${body.urlList.join("\n  ")}`);
  if (dryRun) {
    console.log(`Dry run, not sent. Body:\n${JSON.stringify(body, null, 2)}`);
    return;
  }
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    const text = (await res.text()).slice(0, 500);
    if (indexNowAccepted(res.status)) console.log(`IndexNow answered ${res.status}: OK`);
    else warn(`IndexNow answered ${res.status}${text ? `: ${text}` : ""}`);
  } catch (error) {
    warn(`IndexNow request failed: ${(error as Error).message}`);
  }
}

async function main() {
  const [mode, ...rest] = positionals;
  const dryRun = values["dry-run"];
  if (values.help || !mode) {
    console.log(USAGE);
    return;
  }
  const guideSlugs = GUIDES.map((g) => g.slug);
  let candidates: string[];
  let removed: string[] = [];
  let waitSeconds = 0;
  switch (mode) {
    case "deploy": {
      const sha = values.sha;
      if (!sha) throw new Error("deploy needs --sha");
      const id = values["deployment-id"] ? Number(values["deployment-id"]) : undefined;
      const diff = await nameStatus(sha, Number.isSafeInteger(id) ? id : undefined, values.environment);
      console.log(`Changed files:\n  ${diff.split("\n").join("\n  ") || "(none)"}`);
      ({ changed: candidates, removed } = diffPaths(diff, guideSlugs));
      if (removed.length) console.log(`Deleted or renamed pages: ${removed.join(", ")}`);
      waitSeconds = Number(values.wait) || 0;
      break;
    }
    case "urls": {
      const { paths, rejected } = parseUrlList(rest.join(" "));
      if (rejected.length) warn(`Ignoring URLs not on ${INDEXNOW_ORIGIN}: ${rejected.join(", ")}`);
      candidates = paths;
      break;
    }
    case "all":
      candidates = ["/*"];
      break;
    default:
      throw new Error(`Unknown mode "${mode}".\n${USAGE}`);
  }
  console.log(`Candidates: ${candidates.join(", ") || "(none)"}`);
  const { ok, missing } = candidates.length ? await liveWithWait(candidates, waitSeconds) : { ok: [], missing: [] };
  if (missing.length) console.log(`Skipped, not in the live sitemap or not 200: ${missing.join(", ")}`);
  const { live, gone } = await checkRemoved(removed);
  await ping([...new Set([...ok, ...live, ...gone])], dryRun);
}

await main();
