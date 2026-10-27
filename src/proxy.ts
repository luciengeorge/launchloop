import { after, NextResponse, type NextRequest } from "next/server";
import { deployEnv } from "@/lib/deploy-env";
import { kitExists, kitPageExists } from "@/lib/kit-exists";
import { POSTHOG_PROXY_PATH } from "@/lib/posthog-config";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const BACKSLASH = /%5c|\\/i;

/** skipTrailingSlashRedirect is on for PostHog's slash-terminated API paths, so strip the slash ourselves everywhere else. */
const KEEPS_TRAILING_SLASH = [`${POSTHOG_PROXY_PATH}/`, "/api/"];

/**
 * A page's own notFound() runs inside its Suspense boundary, after the cached shell has gone out with a 200, so the
 * proxy rewrites to a path no route matches: Next renders the root not-found page with a 404. (A route that throws
 * notFound() before streaming does get a 404, but Cache Components then sends a recovery shell with an empty body.)
 * A folder starting with "_" is private in the app router, so this path can never become a route.
 */
const NOT_FOUND_PATH = "/_not-found-rewrite";

const KIT_PAGE = /^\/kit\/([^/]+)$/;
const ACCOUNT_KIT_PAGE = /^\/account\/kits\/([^/]+)$/;

/** The kit pages stream their skeleton in well under this; a store slower than that shouldn't hold every kit view up. */
export const KIT_LOOKUP_TIMEOUT_MS = 1500;

class KitLookupTimeout extends Error {
  constructor() {
    super(`Kit existence check took longer than ${KIT_LOOKUP_TIMEOUT_MS}ms`);
    this.name = "KitLookupTimeout";
  }
}

/**
 * Sends a failed kit check to Sentry after the response has gone out (after(); straight away outside a request), and
 * nothing waits on it: a failed import or report only logs. The import is dynamic on purpose: a static one puts
 * @sentry/nextjs in the proxy entry, which every matched request then loads on a cold start (proxy-imports.test.ts
 * keeps it out).
 */
function reportKitLookupFailure(key: string, error: unknown, context: Record<string, unknown>) {
  const report = () =>
    import("@/lib/observability")
      .then(({ captureExceptionThrottled }) => captureExceptionThrottled(key, error, context))
      .catch((reportError: unknown) => console.error(`[launchloop:error] couldn't report ${key}`, reportError));
  try {
    after(report);
  } catch {
    void report();
  }
}

/** The existence check a path needs, or undefined for paths that don't name a kit (or won't decode). */
function kitLookup({ pathname, searchParams }: NextRequest["nextUrl"]): (() => Promise<boolean>) | undefined {
  try {
    const kitPage = KIT_PAGE.exec(pathname);
    if (kitPage) return kitPageExists.bind(null, decodeURIComponent(kitPage[1]));
    const accountKit = ACCOUNT_KIT_PAGE.exec(pathname);
    if (accountKit) return kitExists.bind(null, decodeURIComponent(accountKit[1]));
  } catch {
    return undefined;
  }
  if (pathname === "/checkout/success") return kitExists.bind(null, searchParams.get("kit") ?? "");
  return undefined;
}

/**
 * True when the request names a kit that isn't stored: /kit/<id> (or a preview still generating), /account/kits/<id>
 * and /checkout/success?kit=<id>. A store error, or no answer within KIT_LOOKUP_TIMEOUT_MS, is reported and false: the
 * page then shows its own skeleton, error or not-found UI, as before.
 *
 * Only the session cookie's presence was checked above, so any made-up ll_session cookie gets a 404 for an unknown id
 * under /account/kits and the page for an existing one. That says no more than /kit/<id> already says to anyone, and
 * ids are 128 random bits, so it can't be used to find kits. Someone else's kit under /account/kits still reaches the
 * page, whose notFound() streams after a 200, as telling it apart needs the verified session.
 */
async function isMissingKit(nextUrl: NextRequest["nextUrl"]): Promise<boolean> {
  const lookup = kitLookup(nextUrl);
  if (!lookup) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new KitLookupTimeout()), KIT_LOOKUP_TIMEOUT_MS);
  });
  // race() subscribes to both, so a lookup that rejects after the timeout has won is still handled.
  const pending = Promise.resolve().then(lookup);
  try {
    return !(await Promise.race([pending, timeout]));
  } catch (error) {
    const { pathname } = nextUrl;
    if (error instanceof KitLookupTimeout) reportKitLookupFailure("proxy.kit-exists.timeout", error, { pathname, timeoutMs: KIT_LOOKUP_TIMEOUT_MS });
    else reportKitLookupFailure("proxy.kit-exists", error, { pathname });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bots probe paths ending in an encoded backslash (`/opengraph-image%5C`). Next.js resolves those to a module
 * that doesn't exist and answers 500 MODULE_NOT_FOUND, so turn them away before routing.
 *
 * `/pricing/` and `/pricing` would otherwise both answer 200, so one page gets two URLs. Redirect to the slashless form,
 * which is what canonicals and the sitemap use.
 *
 * Logged-out `/account*` visits get a real 307 to /login here instead of a cached shell, a skeleton and a streamed
 * redirect. Only the cookie's presence is checked: the page's own getSession() still rejects invalid or expired ones.
 *
 * An unknown kit id under /kit, /account/kits or /checkout/success?kit= gets the same 404 rewrite (isMissingKit).
 */
export async function proxy(request: NextRequest) {
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
  if (await isMissingKit(request.nextUrl)) return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

// Only these requests reach the proxy, so normal pages pay nothing. Backslashes in both spellings, as the matcher may see
// the path encoded or decoded, any path with a trailing slash outside the PostHog relay, the API and Next's assets,
// the signed-in /account pages, the mock checkout and the pages that look up a kit by id.
export const config = {
  matcher: ["/(.*(?:%5[cC]|\\\\).*)", "/((?!lp-relay/|api/|_next/).+/)", "/account", "/account/:path*", "/checkout/mock", "/checkout/success", "/kit/:id"],
};
