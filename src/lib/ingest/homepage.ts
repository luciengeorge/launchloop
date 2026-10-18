/** Hosts where a "homepage" is the code or package page (npm's default is the GitHub readme), not the product's live site. */
const CODE_HOSTS = /^(www\.)?(github\.com|gitlab\.com|bitbucket\.org|npmjs\.com|codeberg\.org)$/i;

/** The product's live page: the repo's homepage, else package.json's, when it's an http(s) site and not a code or package page. */
export function liveHomepage(repoHomepage: string | undefined, packageHomepage: string | undefined): string | undefined {
  for (const candidate of [repoHomepage, packageHomepage]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if ((url.protocol === "https:" || url.protocol === "http:") && !CODE_HOSTS.test(url.hostname)) return candidate;
    } catch {
      // Not a URL (CRA's "." and the like).
    }
  }
  return undefined;
}
