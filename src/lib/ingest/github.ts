import "server-only";
import { env, forceMock } from "../env";
import { mainLanguages, manifestsFor, type ManifestFile } from "../stack";
import { DEFAULT_MAX_BYTES, IngestError, readCappedText, USER_AGENT } from "./safe-fetch";

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
  /** The owner's avatar, only when the owner is an organisation (a person's avatar is their face, not a logo). */
  orgAvatarUrl?: string;
  /**
   * GitHub's API was rate limited, so the repo's visibility was never checked and it was read from public raw files.
   * Anything that follows must not send the token, or it could read a private repo.
   */
  visibilityUnverified?: boolean;
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

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

/** GitHub's username rules: letters, digits and single hyphens, 1-39 characters, no hyphen at either end. */
export const isGitHubOwner = (owner: string) => owner.length <= 39 && /^[A-Za-z0-9](?:-?[A-Za-z0-9])*$/.test(owner);

export const isGitHubRepoName = (name: string) => /^[A-Za-z0-9._-]{1,100}$/.test(name) && name !== "." && name !== "..";

/** A "." or ".." path segment, plain or percent-encoded, that URL parsing would otherwise resolve away. */
const DOT_SEGMENT = /(?:^|[/\\])(?:\.|%2e){1,2}(?=[/\\]|$)/i;

/**
 * Owner and repo from a github.com link, or null. A link with a dot segment is refused rather than resolved, and both
 * names must be valid GitHub names, so nothing built from them can step outside /repos/{owner}/{name}.
 */
export function parseGitHubUrl(input: string): { owner: string; name: string } | null {
  // URL parsing drops tabs and newlines, so ".\t." would become ".." after the check.
  const raw = input.trim().replace(/^git\+/i, "").replace(/[\t\n\r]/g, "");
  // The host and the owner/repo segments must be printable ASCII: URL parsing maps lookalikes such as the fullwidth dot
  // in "github．com" onto real characters. Later segments are only a file path (blob/main/café.md) and can be anything.
  // URL parsing skips any run of slashes after the scheme (https://///host), so they are skipped here too.
  const [rawHost = "", rawOwner = "", rawRepo = ""] = raw.replace(/^(?:https?:)?[\\/]*/i, "").split(/[?#]/)[0].split(/[/\\]/);
  if ([rawHost, rawOwner, rawRepo].some((part) => /[^\x21-\x7e]/.test(part)) || DOT_SEGMENT.test(raw.split(/[?#]/)[0])) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!GITHUB_HOSTS.has(url.hostname)) return null;
  const [owner = "", repo = ""] = url.pathname.split("/").slice(1);
  const name = repo.replace(/\.git$/i, "");
  return isGitHubOwner(owner) && isGitHubRepoName(name) ? { owner, name } : null;
}

/** A link on a scraped page that names exactly one repo, normalised first so the check sees what a fetch would use. */
export function githubRepoLink(href: string): string | undefined {
  if (!/^https?:\/\//i.test(href.trim()) || !parseGitHubUrl(href)) return undefined;
  let url: URL;
  try {
    url = new URL(href.trim());
  } catch {
    return undefined;
  }
  const normalised = `${url.origin}${url.pathname}`;
  if (url.search || url.hash || !/^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/?$/i.test(normalised)) return undefined;
  return parseGitHubUrl(normalised) ? normalised : undefined;
}

/** `/repos/{owner}/{name}`, encoded. Throws before any request is built from an invalid name. */
export function repoApiPath(owner: string, name: string): string {
  if (!isGitHubOwner(owner) || !isGitHubRepoName(name)) {
    throw new IngestError(`Invalid GitHub repo ${owner}/${name}`, "invalid_url", "Paste a repo URL like github.com/owner/repo.");
  }
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

/** A repo file path for a URL: each segment encoded, the slashes kept. */
export const encodeRepoFile = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** A text file from GitHub, read under safe-fetch's streaming cap and cut to `maxChars` (UTF-8 is at most 4 bytes a character). */
export async function cappedText(res: Response, maxChars: number): Promise<string> {
  return (await readCappedText(res, Math.min(maxChars * 4, DEFAULT_MAX_BYTES))).text.slice(0, maxChars);
}

/** The whole body under safe-fetch's default cap, or undefined when it didn't fit. */
async function wholeText(res: Response): Promise<string | undefined> {
  const { text, truncated } = await readCappedText(res, DEFAULT_MAX_BYTES);
  return truncated ? undefined : text;
}

/** A GitHub JSON answer under safe-fetch's default cap. Undefined when it is too big or isn't JSON. */
export async function ghJson<T>(res: Response): Promise<T | undefined> {
  const text = await wholeText(res);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

export const githubApiUrl = (path: string) => `${process.env.GITHUB_API_URL ?? "https://api.github.com"}${path}`;
export const githubAuthHeaders = (): Record<string, string> => (env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {});

/** `authenticated: false` leaves the token off, for a repo whose visibility is unverified. */
export async function gh(path: string, accept = "application/vnd.github+json", signal: AbortSignal = AbortSignal.timeout(8000), authenticated = true): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
    ...(authenticated ? githubAuthHeaders() : {}),
  };
  return fetch(githubApiUrl(path), { headers, signal, cache: "no-store" });
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
    const { items = [] } = (await ghJson<{ items?: { name: string; owner: { login: string } }[] }>(res)) ?? {};
    const hits = items.filter((r) => repoSlug(r.name) === want);
    return hits.length === 1 ? { owner: hits[0].owner.login, name: hits[0].name } : null;
  } catch {
    return null;
  }
}

async function raw(owner: string, name: string, file: string, read: (res: Response) => Promise<string | undefined>): Promise<string | undefined> {
  const res = await fetch(`https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/HEAD/${encodeRepoFile(file)}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  return res.ok ? read(res) : undefined;
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
  const path = repoApiPath(owner, name);
  let meta: Response;
  try {
    meta = await gh(path);
  } catch (error) {
    throw new IngestError(`GitHub API unreachable: ${(error as Error).message}`, "github_unavailable");
  }
  const rateLimited = meta.status === 403 || meta.status === 429;

  if (meta.status === 404) {
    // GitHub answers 404 for private repos too, so all we can tell apart is whether the owner exists.
    const ownerRes = await gh(`/users/${encodeURIComponent(owner)}`).catch(() => null);
    if (ownerRes?.status === 404) throw new IngestError(`GitHub owner ${owner} not found`, "repo_owner_not_found", `There's no GitHub user or organisation called “${owner}”.`);
    throw new IngestError(`Repo ${owner}/${name} not found`, "repo_not_found");
  }

  const repo: RepoData = { owner, name, url: `https://github.com/${owner}/${name}`, topics: [], commits: [] };

  if (rateLimited) {
    warnings.push("GitHub's API rate limit was hit, so stars and commit history were skipped. Set GITHUB_TOKEN to avoid this.");
    const [readme, pkg] = await Promise.all([raw(owner, name, "README.md", (res) => cappedText(res, README_CAP)), raw(owner, name, "package.json", wholeText)]);
    if (!readme && !pkg) {
      throw new IngestError("GitHub rate limited and raw fallback failed", "github_rate_limited");
    }
    repo.readme = readme;
    repo.packageJson = parsePackageJson(pkg, warnings);
    repo.visibilityUnverified = true;
    return repo;
  }

  if (!meta.ok) throw new IngestError(`GitHub API returned ${meta.status}`, "github_unavailable");

  const info = await ghJson<{
    private?: boolean;
    description?: string | null;
    homepage?: string | null;
    stargazers_count?: number;
    topics?: string[];
    language?: string | null;
    license?: { spdx_id?: string } | null;
    html_url: string;
    owner?: { type?: string; avatar_url?: string };
  }>(meta);
  if (!info) throw new IngestError("GitHub API returned an unreadable repo", "github_unavailable");
  // Whatever the token can see, only public code is read: nothing past this line runs for a private repo.
  if (info.private === true) throw new IngestError(`Repo ${owner}/${name} is private`, "repo_private");
  repo.url = info.html_url;
  if (info.owner?.type === "Organization" && info.owner.avatar_url) repo.orgAvatarUrl = info.owner.avatar_url;
  repo.description = info.description ?? undefined;
  repo.homepage = info.homepage || undefined;
  repo.stars = info.stargazers_count;
  repo.topics = info.topics ?? [];
  repo.language = info.language ?? undefined;
  repo.license = info.license?.spdx_id && info.license.spdx_id !== "NOASSERTION" ? info.license.spdx_id : undefined;

  const [readmeRes, pkgRes, commitsRes, languagesRes] = await Promise.all([
    gh(`${path}/readme`, "application/vnd.github.raw+json"),
    gh(`${path}/contents/package.json`, "application/vnd.github.raw+json"),
    gh(`${path}/commits?per_page=${COMMIT_SAMPLE}`),
    gh(`${path}/languages`).catch(() => null),
  ]);

  if (languagesRes?.ok) repo.languages = await ghJson<Record<string, number>>(languagesRes).catch(() => undefined);
  repo.manifests = await fetchManifests(owner, name, manifestsFor(mainLanguages(repo.languages, repo.language)));

  if (readmeRes.ok) repo.readme = await cappedText(readmeRes, README_CAP);
  else warnings.push("No README found in the repo.");

  if (pkgRes.ok) repo.packageJson = parsePackageJson(await wholeText(pkgRes), warnings);

  const commits = commitsRes.ok ? await ghJson<{ sha?: string; commit: { message: string; author?: { date?: string } } }[]>(commitsRes) : undefined;
  if (Array.isArray(commits)) {
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
        const res = await gh(`${repoApiPath(owner, name)}/contents/${encodeRepoFile(file)}`, "application/vnd.github.raw+json");
        return res.ok ? ([file, await cappedText(res, MANIFEST_CAP)] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  const found = read.filter((entry) => entry !== null);
  return found.length ? Object.fromEntries(found) : undefined;
}
