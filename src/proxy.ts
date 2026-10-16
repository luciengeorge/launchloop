import type { NextRequest } from "next/server";

const BACKSLASH = /%5c|\\/i;

/**
 * Bots probe paths ending in an encoded backslash (`/opengraph-image%5C`). Next.js resolves those to a module
 * that doesn't exist and answers 500 MODULE_NOT_FOUND, so turn them away before routing.
 */
export function proxy(request: NextRequest) {
  if (BACKSLASH.test(request.nextUrl.pathname)) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
}

// Only these requests reach the proxy, so normal pages pay nothing. Both spellings, as the matcher may see the path encoded or decoded.
export const config = {
  matcher: ["/(.*(?:%5[cC]|\\\\).*)"],
};
