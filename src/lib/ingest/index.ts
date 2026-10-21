import "server-only";
import { phase } from "../kit-tracing";
import { captureException, captureExceptionThrottled } from "../observability";
import type { KitVisuals, Palette, SourceSummary } from "../schema";
import { DEFAULT_PALETTE, extractPalette } from "./colors";
import { fetchRepo, findRepoByName, parseGitHubUrl, type RepoData } from "./github";
import { liveHomepage } from "./homepage";
import { IngestError } from "./safe-fetch";
import { fetchRepoPalette } from "./repo-palette";
import { SAMPLE_INPUT, sampleRepo, sampleSite } from "./sample";
import { fetchSite, type SiteData } from "./site";
import { discoverVisuals } from "./visuals";

export { IngestError } from "./safe-fetch";

export interface IngestResult {
  /** Which source the user pasted; it wins when the two disagree. */
  primary: "repo" | "site";
  repo?: RepoData;
  site?: SiteData;
  palette: Palette;
  visuals: KitVisuals;
  source: SourceSummary;
}

/** Accepts a GitHub repo URL, a live site URL, or bare forms like `github.com/a/b` / `myapp.com`. */
export function normaliseInput(raw: string): string {
  const input = raw.trim();
  if (input.toLowerCase() === SAMPLE_INPUT) return SAMPLE_INPUT;
  if (!input || input.length > 500 || /\s/.test(input)) {
    throw new IngestError("Invalid input", "invalid_url", input ? "That doesn't look like a link." : "Paste a GitHub repo URL or your live site URL.");
  }
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new IngestError("Invalid URL", "invalid_url");
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
    throw new IngestError("Invalid host", "invalid_url");
  }
  return url.toString();
}

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

/**
 * normaliseInput for a kit: a github.com link must name a repo. Without this, github.com/owner falls
 * through to the site path and builds a kit from the profile page.
 */
export function normaliseKitInput(raw: string): string {
  const input = normaliseInput(raw);
  if (input !== SAMPLE_INPUT && GITHUB_HOSTS.has(new URL(input).hostname) && !parseGitHubUrl(input)) {
    throw new IngestError("GitHub URL without owner/repo", "invalid_url", "Paste a repo URL like github.com/owner/repo.");
  }
  return input;
}

export type IngestStep = "repo" | "site";

export async function ingest(rawInput: string, onStep: (step: IngestStep) => void = () => {}): Promise<IngestResult> {
  const input = normaliseKitInput(rawInput);
  const warnings: string[] = [];

  if (input === SAMPLE_INPUT) {
    return {
      primary: "repo",
      repo: sampleRepo,
      site: sampleSite,
      palette: extractPalette({ css: sampleSite.css, themeColor: sampleSite.themeColor }),
      visuals: {},
      source: summarise(input, sampleRepo, sampleSite, warnings),
    };
  }

  let repo: RepoData | undefined;
  let site: SiteData | undefined;
  const gh = parseGitHubUrl(input);

  if (gh) {
    onStep("repo");
    repo = await tracedRepo(gh.owner, gh.name, warnings);
    const homepage = liveHomepage(repo.homepage, repo.packageJson?.homepage);
    if (homepage) {
      onStep("site");
      site = await trySite(homepage, warnings);
      // An open-source repo's site only counts as "paid" if it links to its own pricing page.
      if (site && !site.pricingUrl) site = { ...site, prices: [] };
    } else warnings.push("The repo has no homepage set, so brand colours fell back to defaults unless found elsewhere.");
  } else {
    onStep("site");
    // The pasted site is the only source, so its failure is the user's error to see.
    site = await tracedSite(input, warnings);
    const linked = site.githubUrl ? parseGitHubUrl(site.githubUrl) : null;
    if (!hasUsableContent(site)) {
      // A client-rendered page (an empty <div id="root">) has nothing to read; its own repo usually does.
      repo = await repoForEmptySite(site, linked, warnings);
      if (!repo) throw new IngestError(`No usable content at ${input}`, "site_no_content");
    } else if (linked) {
      onStep("repo");
      try {
        const candidate = await tracedRepo(linked.owner, linked.name, warnings);
        if (repoMatchesSite(candidate, site)) repo = candidate;
        else warnings.push(`The page links to ${candidate.url}, but it doesn't look like this app's own repo, so we used the live page only.`);
      } catch (error) {
        warnings.push("The site links to a GitHub repo we couldn't read, so the brief uses the live page only.");
        captureException(error, { stage: "ingest.linkedRepo", url: site.githubUrl });
      }
    }
  }

  const sitePalette = site ? extractPalette({ css: site.css, themeColor: site.themeColor }) : DEFAULT_PALETTE;
  const [palette, visuals] = await Promise.all([
    sitePalette.source === "default" && repo ? tracedRepoPalette(repo.owner, repo.name) : sitePalette,
    tracedVisuals(repo, site),
  ]);
  const primary = gh || (repo && !hasUsableContent(site!)) ? "repo" : "site";
  return { primary, repo, site, palette, visuals, source: summarise(input, repo, site, warnings) };
}

/** The empty page's own repo: the GitHub link on it, else the one repo named like its host or <title>. */
async function repoForEmptySite(site: SiteData, linked: { owner: string; name: string } | null, warnings: string[]): Promise<RepoData | undefined> {
  const host = new URL(site.url).hostname.replace(/^www\./, "").split(".")[0];
  const title = site.title?.split(/\s[|·:–—-]\s/)[0];
  const guess =
    linked ?? (await findRepoByName(host)) ?? (title && slug(title) !== slug(host) ? await findRepoByName(title) : null);
  if (!guess) return undefined;
  try {
    const candidate = await tracedRepo(guess.owner, guess.name, warnings);
    return repoMatchesSite(candidate, site) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

/** Best effort: a kit without a screenshot or logo still renders, so a failure here never fails the ingest. */
async function tracedVisuals(repo: RepoData | undefined, site: SiteData | undefined): Promise<KitVisuals> {
  try {
    return await phase("ingest.visuals", "http.client", { "kit.repo": repo ? `${repo.owner}/${repo.name}` : "[none]" }, () => discoverVisuals(repo, site));
  } catch (error) {
    // A bug here would otherwise report on every ingest; one event per error type per minute is enough.
    captureExceptionThrottled(`ingest.visuals:${error instanceof Error ? error.name : "unknown"}`, error, { stage: "ingest.visuals" });
    return {};
  }
}

const tracedRepoPalette = (owner: string, name: string) =>
  phase("ingest.repo_palette", "http.client.github", { "kit.repo": `${owner}/${name}` }, () => fetchRepoPalette(owner, name));

/** Repo URLs are public, so the span names the repo; a site is recorded by host only. */
const tracedRepo = (owner: string, name: string, warnings: string[]) =>
  phase("ingest.github", "http.client.github", { "kit.repo": `${owner}/${name}` }, () => fetchRepo(owner, name, warnings));

const tracedSite = (url: string, warnings: string[]) =>
  phase("ingest.site", "http.client.site", { "kit.site_host": URL.parse(url)?.host ?? "[unparseable]" }, () => fetchSite(url, warnings));

function hasUsableContent(site: SiteData): boolean {
  const words = [site.title, site.description, site.h1, ...site.headings, ...site.paragraphs, ...site.listItems].filter(Boolean).join(" ");
  return words.split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w)).length >= 4;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** A site often links to SDKs or examples; only treat the repo as the app's own if it clearly matches. */
function repoMatchesSite(repo: RepoData, site: SiteData): boolean {
  const siteHost = new URL(site.url).hostname.replace(/^www\./, "");
  if (repo.homepage) {
    try {
      if (new URL(repo.homepage).hostname.replace(/^www\./, "") === siteHost) return true;
    } catch {
      // Malformed homepage values are common; fall through to name matching.
    }
  }
  const label = slug(siteHost.split(".")[0]);
  const names = [label, site.siteName ? slug(site.siteName.split(/\s[|·:–—-]\s/)[0]) : ""].filter(Boolean);
  return names.includes(slug(repo.name));
}

async function trySite(url: string, warnings: string[]): Promise<SiteData | undefined> {
  try {
    return await tracedSite(url, warnings);
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
    fingerprint: input === SAMPLE_INPUT ? "sample@v1" : repo?.headSha ? `${repo.url.toLowerCase()}@${repo.headSha}` : undefined,
    readmeFound: !!repo?.readme,
    packageJsonFound: !!repo?.packageJson,
    pageScraped: !!site,
    warnings,
  };
}
