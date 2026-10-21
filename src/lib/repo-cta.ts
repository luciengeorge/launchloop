/** What the "Use my GitHub repo instead" button puts in the input when the site had no readable text. */
export const GITHUB_PREFIX = "https://github.com/";

export type RepoPrefill = "github_pages" | "github";

const withScheme = (input: string) => (/^https?:\/\//i.test(input) ? input : `https://${input}`);

/**
 * A GitHub Pages address names its repo: you.github.io (or a page at its root, you.github.io/index.html) is
 * github.com/you/you.github.io and you.github.io/app is github.com/you/app. Project repos are often named like files
 * (normalize.css, reveal.js), so only a lone .html/.htm segment without a trailing slash counts as a root page.
 * Any other host says nothing about the repo, so the visitor starts from github.com/.
 */
export function repoPrefill(input: string): { value: string; prefill: RepoPrefill } {
  let url: URL;
  try {
    url = new URL(withScheme(input.trim()));
  } catch {
    return { value: GITHUB_PREFIX, prefill: "github" };
  }
  const owner = url.hostname.toLowerCase().match(/^([a-z0-9-]+)\.github\.io$/)?.[1];
  if (!owner) return { value: GITHUB_PREFIX, prefill: "github" };
  const segments = url.pathname.split("/").filter(Boolean);
  const rootPage = segments.length === 1 && !url.pathname.endsWith("/") && /\.html?$/i.test(segments[0]);
  const repo = segments[0] && !rootPage ? segments[0] : `${owner}.github.io`;
  return { value: `${GITHUB_PREFIX}${owner}/${repo}`, prefill: "github_pages" };
}

/** Scheme and host are case-insensitive; the path isn't (a.com/App and a.com/app can be different pages). */
const comparable = (input: string) => {
  const [, host = "", rest = ""] = input.trim().replace(/^https?:\/\//i, "").match(/^([^/?#]*)(.*)$/) ?? [];
  return `${host.toLowerCase()}${rest}`.replace(/\/+$/, "");
};

/** The same link as far as the site fetch goes: the scheme, the host's case and trailing slashes don't change what it reads. */
export const sameInput = (a: string, b: string) => comparable(a) === comparable(b);

const GITHUB_FORMS = ["", "http://", "https://"].flatMap((scheme) => ["", "www."].map((www) => `${scheme}${www}github.com/`));

/**
 * Still a GitHub link, or on the way to one (typing www.github.com/..., backspacing through the https://github.com/
 * prefill), so the form stays in repo mode. Empty, or any other site, is not.
 */
export function looksLikeGitHubUrl(input: string): boolean {
  const value = input.trim().toLowerCase();
  if (!value) return false;
  return /^(https?:\/\/)?(www\.)?github\.com(\/|$)/.test(value) || GITHUB_FORMS.some((form) => form.startsWith(value));
}

/** A paste of a whole link onto the bare prefix replaces it, so it doesn't become github.com/https://github.com/... */
export const replacesPrefix = (current: string, pasted: string) => current === GITHUB_PREFIX && /^(https?:\/\/|(www\.)?github\.com\/)/i.test(pasted.trim());
