/** What the "Use my GitHub repo instead" button puts in the input when the site had no readable text. */
export const GITHUB_PREFIX = "https://github.com/";

export type RepoPrefill = "github_pages" | "github";

const withScheme = (input: string) => (/^https?:\/\//i.test(input) ? input : `https://${input}`);

/**
 * A GitHub Pages address names its repo: you.github.io is github.com/you/you.github.io and you.github.io/app is
 * github.com/you/app. Any other host says nothing about the repo, so the visitor starts from github.com/.
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
  const repo = url.pathname.split("/").find(Boolean) ?? `${owner}.github.io`;
  return { value: `${GITHUB_PREFIX}${owner}/${repo}`, prefill: "github_pages" };
}

const comparable = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

/** The same link as far as the site fetch goes: case, the scheme and trailing slashes don't change what it reads. */
export const sameInput = (a: string, b: string) => comparable(a) === comparable(b);

/** A paste of a whole link onto the bare prefix replaces it, so it doesn't become github.com/https://github.com/... */
export const replacesPrefix = (current: string, pasted: string) => current === GITHUB_PREFIX && /^(https?:\/\/|(www\.)?github\.com\/)/i.test(pasted.trim());
