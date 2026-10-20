import { PREVIEW_LIMITS } from "./site";

/** The free-preview allowance in a sentence. The form shows it alone next to its live "Try again in N min" countdown. */
export const PREVIEW_ALLOWANCE = `You can run ${PREVIEW_LIMITS.perHour} an hour and ${PREVIEW_LIMITS.perDay} a day.`;

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
  | "ai_busy"
  | "rate_limited"
  | "busy"
  | "unknown";

export const KIT_ERRORS: Record<KitErrorCode, { title: string; fix: string }> = {
  invalid_url: { title: "That doesn't look like a link.", fix: "Paste something like github.com/you/your-app or https://your-app.com." },
  repo_not_found: {
    title: "This repo is private or doesn't exist.",
    fix: "We can only read public repos right now. Make the repo public, or paste your live site URL instead. Otherwise check the spelling of the repo name.",
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
  ai_busy: { title: "Our AI is busy, try again in a minute.", fix: "Nothing is wrong with your link, and nothing was saved. Retry in a minute and we'll write it from scratch." },
  rate_limited: {
    title: "You've used your free previews for now.",
    fix: `${PREVIEW_ALLOWANCE} Try again later, or unlock the full kit for an app you've already previewed.`,
  },
  busy: {
    title: "LaunchLoop is very busy right now, try again in a bit.",
    fix: "Free previews are paused for a little while. Kits you've already unlocked aren't affected.",
  },
  unknown: { title: "Something went wrong reading your app.", fix: "Try again. If it keeps happening, email hello@launchloop.dev." },
};

export interface KitErrorBody {
  error: string;
  code: KitErrorCode;
  fix: string;
  /** Only on rate_limited: when the visitor's limit resets, also sent as the Retry-After header. */
  retryAfterSeconds?: number;
  /** Only on rate_limited: the visitor's newest unpaid preview, for the "Unlock my kit" button. */
  kitId?: string;
}

export const kitErrorBody = (code: KitErrorCode, title?: string): KitErrorBody => ({ error: title ?? KIT_ERRORS[code].title, code, fix: KIT_ERRORS[code].fix });

/** "23 min" up to an hour and a half, then "5 hours". Never "0 min". */
export function waitLabel(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes <= 90 ? `${minutes} min` : `${Math.round(minutes / 60)} hours`;
}

export const rateLimitedBody = (retryAfterSeconds: number): KitErrorBody => ({
  ...kitErrorBody("rate_limited"),
  fix: `${PREVIEW_ALLOWANCE} Try again in ${waitLabel(retryAfterSeconds)}, or unlock the full kit for an app you've already previewed.`,
  retryAfterSeconds,
});
