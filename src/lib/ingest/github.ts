import "server-only";
import { env, forceMock } from "../env";
import { mainLanguages, manifestsFor, type ManifestFile } from "../stack";
import { IngestError, USER_AGENT } from "./safe-fetch";

export interface RepoData {
  owner: string;
  name: string;
  url: string;
  description?: string;
  homepage?: string;
  stars?: number;
  topics: string[];
  language?: string;
  /** Bytes of code per language, from GitHub's languages API. */
  languages?: Record<string, number>;
  license?: string;
  readme?: string;
  packageJson?: PackageJson;
  /** Dependency manifests for the repo's main non-JavaScript languages (mix.exs, Gemfile, go.mod, ...). */
  manifests?: Partial<Record<ManifestFile, string>>;
  commits: { message: string; date: string }[];
  /** Latest commit on the default branch, used to dedupe identical repo states. */
  headSha?: string;
}

export interface PackageJson {
  name?: string;
  description?: string;
  homepage?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: unknown;
}

const README_CAP = 12_000;
const MANIFEST_CAP = 40_000;
/** How many recent commits we read. Anything counted from them is a floor, not a total. */
export const COMMIT_SAMPLE = 20;

export function parseGitHubUrl(input: string): { owner: string; name: string } | null {
  const m = input
    .trim()
    .replace(/^git\+/, "")
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i);
  if (!m) return null;
  return { owner: m[1], name: m[2] };
}

export async function gh(path: string, accept = "application/vnd.github+json", signal: AbortSignal = AbortSignal.timeout(8000)): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;
  return fetch(`${process.env.GITHUB_API_URL ?? "https://api.github.com"}${path}`, { headers, signal, cache: "no-store" });
}

const repoSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The one public repo named exactly `name` (ignoring case and punctuation), for a live page that renders nothing
 * without JavaScript. Null when there is no match or more than one, so a common name never picks a stranger's repo.
 */
export async function findRepoByName(name: string): Promise<{ owner: string; name: string } | null> {
  const want = repoSlug(name);
  // Mock mode only searches a fake GitHub (GITHUB_API_URL), never the real one.
  if (want.length < 4 || (forceMock && !process.env.GITHUB_API_URL)) return null;
  try {
    const q = encodeURIComponent(`${name} in:name fork:false archived:false`);
    const res = await gh(`/search/repositories?q=${q}&per_page=10`, undefined, AbortSignal.timeout(4000));
    if (!res.ok) return null;
    const { items = [] } = (await res.json()) as { items?: { name: string; owner: { login: string } }[] };
    const hits = items.filter((r) => repoSlug(r.name) === want);
    return hits.length === 1 ? { owner: hits[0].owner.login, name: hits[0].name } : null;
  } catch {
    return null;
  }
}

async function raw(owner: string, name: string, file: string): Promise<string | undefined> {
  const res = await fetch(`https://raw.githubusercontent.com/${owner}/${name}/HEAD/${file}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  return res.ok ? res.text() : undefined;
}

function parsePackageJson(text: string | undefined, warnings: string[]): PackageJson | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as PackageJson;
  } catch {
    warnings.push("package.json exists but isn't valid JSON, so it was skipped.");
    return undefined;
  }
}

export async function fetchRepo(owner: string, name: string, warnings: string[]): Promise<RepoData> {
  let meta: Response;
  try {
    meta = await gh(`/repos/${owner}/${name}`);
  } catch (error) {
    throw new IngestError(`GitHub API unreachable: ${(error as Error).message}`, "github_unavailable");
  }
  const rateLimited = meta.status === 403 || meta.status === 429;

  if (meta.status === 404) {
    // GitHub answers 404 for private repos too, so all we can tell apart is whether the owner exists.
    const ownerRes = await gh(`/users/${owner}`).catch(() => null);
    if (ownerRes?.status === 404) throw new IngestError(`GitHub owner ${owner} not found`, "repo_owner_not_found", `There's no GitHub user or organisation called “${owner}”.`);
    throw new IngestError(`Repo ${owner}/${name} not found`, "repo_not_found");
  }

  const repo: RepoData = { owner, name, url: `https://github.com/${owner}/${name}`, topics: [], commits: [] };

  if (rateLimited) {
    warnings.push("GitHub's API rate limit was hit, so stars and commit history were skipped. Set GITHUB_TOKEN to avoid this.");
    const [readme, pkg] = await Promise.all([raw(owner, name, "README.md"), raw(owner, name, "package.json")]);
    if (!readme && !pkg) {
      throw new IngestError("GitHub rate limited and raw fallback failed", "github_rate_limited");
    }
    repo.readme = readme?.slice(0, README_CAP);
    repo.packageJson = parsePackageJson(pkg, warnings);
    return repo;
  }

  if (!meta.ok) throw new IngestError(`GitHub API returned ${meta.status}`, "github_unavailable");

  const info = (await meta.json()) as {
    description?: string | null;
    homepage?: string | null;
    stargazers_count?: number;
    topics?: string[];
    language?: string | null;
    license?: { spdx_id?: string } | null;
    html_url: string;
  };
  repo.url = info.html_url;
  repo.description = info.description ?? undefined;
  repo.homepage = info.homepage || undefined;
  repo.stars = info.stargazers_count;
  repo.topics = info.topics ?? [];
  repo.language = info.language ?? undefined;
  repo.license = info.license?.spdx_id && info.license.spdx_id !== "NOASSERTION" ? info.license.spdx_id : undefined;

  const [readmeRes, pkgRes, commitsRes, languagesRes] = await Promise.all([
    gh(`/repos/${owner}/${name}/readme`, "application/vnd.github.raw+json"),
    gh(`/repos/${owner}/${name}/contents/package.json`, "application/vnd.github.raw+json"),
    gh(`/repos/${owner}/${name}/commits?per_page=${COMMIT_SAMPLE}`),
    gh(`/repos/${owner}/${name}/languages`).catch(() => null),
  ]);

  if (languagesRes?.ok) repo.languages = (await languagesRes.json().catch(() => undefined)) as Record<string, number> | undefined;
  repo.manifests = await fetchManifests(owner, name, manifestsFor(mainLanguages(repo.languages, repo.language)));

  if (readmeRes.ok) repo.readme = (await readmeRes.text()).slice(0, README_CAP);
  else warnings.push("No README found in the repo.");

  if (pkgRes.ok) repo.packageJson = parsePackageJson(await pkgRes.text(), warnings);

  if (commitsRes.ok) {
    const commits = (await commitsRes.json()) as { sha?: string; commit: { message: string; author?: { date?: string } } }[];
    repo.headSha = commits[0]?.sha;
    repo.commits = commits.map((c) => ({
      message: c.commit.message.split("\n")[0].slice(0, 160),
      date: c.commit.author?.date ?? "",
    }));
  }

  return repo;
}

/** Best effort: a missing or unreadable manifest just means less stack detail. */
async function fetchManifests(owner: string, name: string, files: ManifestFile[]): Promise<RepoData["manifests"]> {
  const read = await Promise.all(
    files.map(async (file) => {
      try {
        const res = await gh(`/repos/${owner}/${name}/contents/${file}`, "application/vnd.github.raw+json");
        return res.ok ? ([file, (await res.text()).slice(0, MANIFEST_CAP)] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  const found = read.filter((entry) => entry !== null);
  return found.length ? Object.fromEntries(found) : undefined;
}
