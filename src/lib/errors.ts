/** User-facing error catalogue, shared by the API and the form. Every entry says what happened and what to do. */
export type KitErrorCode =
  | "invalid_url"
  | "repo_not_found"
  | "repo_owner_not_found"
  | "github_rate_limited"
  | "github_unavailable"
  | "site_unreachable"
  | "site_timeout"
  | "site_http_error"
  | "site_blocked"
  | "site_no_content"
  | "site_not_html"
  | "llm_failed"
  | "rate_limited"
  | "unknown";

export const KIT_ERRORS: Record<KitErrorCode, { title: string; fix: string }> = {
  invalid_url: { title: "That doesn't look like a link.", fix: "Paste something like github.com/you/your-app or https://your-app.com." },
  repo_not_found: {
    title: "This repo is private or doesn't exist.",
    fix: "If it's private, paste your live URL instead, or make the repo public. Otherwise check the spelling of the repo name.",
  },
  repo_owner_not_found: { title: "There's no GitHub user or organisation with that name.", fix: "Check the spelling in the URL, or paste your live site URL instead." },
  github_rate_limited: { title: "GitHub is rate limiting us right now.", fix: "Try again in a few minutes, or paste your live site URL instead." },
  github_unavailable: { title: "GitHub didn't respond as expected.", fix: "Try again in a minute, or paste your live site URL instead." },
  site_unreachable: { title: "We couldn't reach that site.", fix: "Check the address is spelled right and the site is live, or paste your GitHub repo instead." },
  site_timeout: { title: "That site took too long to respond.", fix: "Check it loads in your browser and try again, or paste your GitHub repo instead." },
  site_http_error: { title: "That page returned an error.", fix: "Check the URL opens in a private window, try your homepage, or paste your GitHub repo instead." },
  site_blocked: { title: "That address isn't publicly reachable.", fix: "Use the public URL of your live site, not a local or private address." },
  site_no_content: {
    title: "We couldn't find any words on that page.",
    fix: "It probably renders everything with JavaScript. Paste your GitHub repo instead, or add a <title> and meta description to the page.",
  },
  site_not_html: {
    title: "That link isn't a web page.",
    fix: "It points to a file or an API response. Paste your homepage or landing page URL (like https://your-app.com), or your GitHub repo.",
  },
  llm_failed: { title: "Our AI writer is having a moment.", fix: "Nothing is wrong with your link. Try again in a minute." },
  rate_limited: { title: "You've hit the free preview limit for now.", fix: "Try again in a little while. Your earlier previews are saved under My kits once you log in." },
  unknown: { title: "Something went wrong reading your app.", fix: "Try again. If it keeps happening, email hello@launchloop.dev." },
};

export interface KitErrorBody {
  error: string;
  code: KitErrorCode;
  fix: string;
}

export const kitErrorBody = (code: KitErrorCode, title?: string): KitErrorBody => ({ error: title ?? KIT_ERRORS[code].title, code, fix: KIT_ERRORS[code].fix });
