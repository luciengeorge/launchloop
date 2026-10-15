import "server-only";
import { captureException } from "../observability";
import type { Palette, SourceSummary } from "../schema";
import { DEFAULT_PALETTE, extractPalette } from "./colors";
import { fetchRepo, parseGitHubUrl, type RepoData } from "./github";
import { IngestError } from "./safe-fetch";
import { SAMPLE_INPUT, sampleRepo, sampleSite } from "./sample";
import { fetchSite, type SiteData } from "./site";

export { IngestError } from "./safe-fetch";

export interface IngestResult {
  repo?: RepoData;
  site?: SiteData;
  palette: Palette;
  source: SourceSummary;
}

/** Accepts a GitHub repo URL, a live site URL, or bare forms like `github.com/a/b` / `myapp.com`. */
export function normaliseInput(raw: string): string {
  const input = raw.trim();
  if (input.toLowerCase() === SAMPLE_INPUT) return SAMPLE_INPUT;
  if (!input || input.length > 500 || /\s/.test(input)) {
    throw new IngestError("Invalid input", "Paste a public GitHub repo URL or your live site URL.");
  }
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new IngestError("Invalid URL", "That doesn't look like a URL. Try something like https://github.com/you/your-app.");
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
    throw new IngestError("Invalid host", "That doesn't look like a URL. Try something like https://your-app.com.");
  }
  return url.toString();
}

export async function ingest(rawInput: string): Promise<IngestResult> {
  const input = normaliseInput(rawInput);
  const warnings: string[] = [];

  if (input === SAMPLE_INPUT) {
    return {
      repo: sampleRepo,
      site: sampleSite,
      palette: extractPalette({ css: sampleSite.css, themeColor: sampleSite.themeColor }),
      source: summarise(input, sampleRepo, sampleSite, warnings),
    };
  }

  let repo: RepoData | undefined;
  let site: SiteData | undefined;
  const gh = parseGitHubUrl(input);

  if (gh) {
    repo = await fetchRepo(gh.owner, gh.name, warnings);
    const homepage = repo.homepage ?? repo.packageJson?.homepage;
    if (homepage && /^https?:\/\//.test(homepage)) site = await trySite(homepage, warnings);
    else warnings.push("The repo has no homepage set, so brand colours fell back to defaults unless found elsewhere.");
  } else {
    site = await trySite(input, warnings);
    if (!site) {
      throw new IngestError("Site unreachable", "We couldn't load that page. Check the URL is public, or paste your GitHub repo instead.");
    }
    const linked = site.githubUrl ? parseGitHubUrl(site.githubUrl) : null;
    if (linked) {
      try {
        repo = await fetchRepo(linked.owner, linked.name, warnings);
      } catch (error) {
        warnings.push("The site links to a GitHub repo we couldn't read, so the brief uses the live page only.");
        captureException(error, { stage: "ingest.linkedRepo", url: site.githubUrl });
      }
    }
  }

  const palette = site ? extractPalette({ css: site.css, themeColor: site.themeColor }) : DEFAULT_PALETTE;
  return { repo, site, palette, source: summarise(input, repo, site, warnings) };
}

async function trySite(url: string, warnings: string[]): Promise<SiteData | undefined> {
  try {
    return await fetchSite(url, warnings);
  } catch (error) {
    warnings.push(`Couldn't load the live page at ${url}.`);
    if (!(error instanceof IngestError)) captureException(error, { stage: "ingest.site", url });
    return undefined;
  }
}

function summarise(input: string, repo: RepoData | undefined, site: SiteData | undefined, warnings: string[]): SourceSummary {
  return {
    input,
    repoUrl: repo?.url,
    siteUrl: site?.url,
    stars: repo?.stars,
    commitsAnalysed: repo?.commits.length ?? 0,
    readmeFound: !!repo?.readme,
    packageJsonFound: !!repo?.packageJson,
    pageScraped: !!site,
    warnings,
  };
}
