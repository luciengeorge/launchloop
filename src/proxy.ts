import { NextResponse, type NextRequest } from "next/server";
import { deployEnv } from "@/lib/deploy-env";
import { POSTHOG_PROXY_PATH } from "@/lib/posthog-config";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const BACKSLASH = /%5c|\\/i;

/** skipTrailingSlashRedirect is on for PostHog's slash-terminated API paths, so strip the slash ourselves everywhere else. */
const KEEPS_TRAILING_SLASH = [`${POSTHOG_PROXY_PATH}/`, "/api/"];

/**
 * Production has no mock checkout. The page's own notFound() runs inside its Suspense boundary, after the cached shell
 * has gone out with a 200, so the proxy rewrites to a path no route matches: Next renders the not-found page with a 404.
 * A folder starting with "_" is private in the app router, so this path can never become a route.
 */
const NOT_FOUND_PATH = "/_not-found-checkout-mock";

/**
 * Bots probe paths ending in an encoded backslash (`/opengraph-image%5C`). Next.js resolves those to a module
 * that doesn't exist and answers 500 MODULE_NOT_FOUND, so turn them away before routing.
 *
 * `/pricing/` and `/pricing` would otherwise both answer 200, so one page gets two URLs. Redirect to the slashless form,
 * which is what canonicals and the sitemap use.
 *
 * Logged-out `/account*` visits get a real 307 to /login here instead of a cached shell, a skeleton and a streamed
 * redirect. Only the cookie's presence is checked: the page's own getSession() still rejects invalid or expired ones.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (BACKSLASH.test(pathname)) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  if (pathname.length > 1 && pathname.endsWith("/") && !KEEPS_TRAILING_SLASH.some((prefix) => pathname.startsWith(prefix))) {
    // A plain URL: NextURL keeps the request's trailing slash when it serialises, which would redirect to itself.
    const url = new URL(request.url);
    url.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(url, 308);
  }
  if ((pathname === "/account" || pathname.startsWith("/account/")) && !request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname + search)}`, request.url), 307);
  }
  if (pathname === "/checkout/mock" && deployEnv() === "production") return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

// Only these requests reach the proxy, so normal pages pay nothing. Backslashes in both spellings, as the matcher may see
// the path encoded or decoded, any path with a trailing slash outside the PostHog relay, the API and Next's assets,
// the signed-in /account pages and the mock checkout.
export const config = {
  matcher: ["/(.*(?:%5[cC]|\\\\).*)", "/((?!lp-relay/|api/|_next/).+/)", "/account", "/account/:path*", "/checkout/mock"],
};
