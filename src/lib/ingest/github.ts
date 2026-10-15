import "server-only";
import { env } from "../env";
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
  license?: string;
  readme?: string;
  packageJson?: PackageJson;
  commits: { message: string; date: string }[];
}

export interface PackageJson {
  name?: string;
  description?: string;
  homepage?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const README_CAP = 12_000;

export function parseGitHubUrl(input: string): { owner: string; name: string } | null {
  const m = input
    .trim()
    .replace(/^git\+/, "")
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i);
  if (!m) return null;
  return { owner: m[1], name: m[2] };
}

async function gh(path: string, accept = "application/vnd.github+json"): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;
  return fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(8000), cache: "no-store" });
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
  const meta = await gh(`/repos/${owner}/${name}`);
  const rateLimited = meta.status === 403 || meta.status === 429;

  if (meta.status === 404) {
    throw new IngestError(
      `Repo ${owner}/${name} not found`,
      "We couldn't find that repository. LaunchLoop only reads public GitHub repos for now.",
    );
  }

  const repo: RepoData = { owner, name, url: `https://github.com/${owner}/${name}`, topics: [], commits: [] };

  if (rateLimited) {
    warnings.push("GitHub's API rate limit was hit, so stars and commit history were skipped. Set GITHUB_TOKEN to avoid this.");
    const [readme, pkg] = await Promise.all([raw(owner, name, "README.md"), raw(owner, name, "package.json")]);
    if (!readme && !pkg) {
      throw new IngestError("GitHub rate limited and raw fallback failed", "GitHub is rate limiting us right now. Try again in a few minutes.");
    }
    repo.readme = readme?.slice(0, README_CAP);
    repo.packageJson = parsePackageJson(pkg, warnings);
    return repo;
  }

  if (!meta.ok) throw new IngestError(`GitHub API returned ${meta.status}`, "GitHub didn't respond as expected. Try again shortly.");

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

  const [readmeRes, pkgRes, commitsRes] = await Promise.all([
    gh(`/repos/${owner}/${name}/readme`, "application/vnd.github.raw+json"),
    gh(`/repos/${owner}/${name}/contents/package.json`, "application/vnd.github.raw+json"),
    gh(`/repos/${owner}/${name}/commits?per_page=20`),
  ]);

  if (readmeRes.ok) repo.readme = (await readmeRes.text()).slice(0, README_CAP);
  else warnings.push("No README found in the repo.");

  if (pkgRes.ok) repo.packageJson = parsePackageJson(await pkgRes.text(), warnings);

  if (commitsRes.ok) {
    const commits = (await commitsRes.json()) as { commit: { message: string; author?: { date?: string } } }[];
    repo.commits = commits.map((c) => ({
      message: c.commit.message.split("\n")[0].slice(0, 160),
      date: c.commit.author?.date ?? "",
    }));
  }

  return repo;
}
