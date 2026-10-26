import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE } from "@/lib/auth";
import { config, proxy } from "@/proxy";

const ORIGIN = "https://launchloop.dev";

function request(path: string, cookie?: string) {
  return new NextRequest(`${ORIGIN}${path}`, { headers: cookie ? { cookie } : {} });
}

const location = (res: Response) => res.headers.get("location");

describe("proxy: logged-out /account redirect", () => {
  it.each([
    ["/account", "/login?next=%2Faccount"],
    ["/account?billing=error", "/login?next=%2Faccount%3Fbilling%3Derror"],
    ["/account/kits/AKWq8__P15_kweHmfXX_Uw", "/login?next=%2Faccount%2Fkits%2FAKWq8__P15_kweHmfXX_Uw"],
  ])("sends %s without a session cookie to %s with a 307", (path, target) => {
    const res = proxy(request(path))!;
    expect(res.status).toBe(307);
    expect(location(res)).toBe(`${ORIGIN}${target}`);
  });

  it("encodes next the same way the page-level redirect does, so /login reads back the original path", () => {
    const id = "AKWq8__P15_kweHmfXX_Uw";
    const target = new URL(location(proxy(request(`/account/kits/${id}`))!)!);
    expect(target.search).toBe(`?next=${encodeURIComponent(`/account/kits/${id}`)}`);
    expect(target.searchParams.get("next")).toBe(`/account/kits/${id}`);
  });

  it.each(["/account", "/account/kits/AKWq8__P15_kweHmfXX_Uw"])("lets %s through when a session cookie is present, even an unverified one", (path) => {
    expect(proxy(request(path, `${SESSION_COOKIE}=anything.signed`))).toBeUndefined();
  });

  it("treats an empty session cookie as logged out", () => {
    expect(proxy(request("/account", `${SESSION_COOKIE}=`))?.status).toBe(307);
  });

  it("ignores other cookies and lookalike paths", () => {
    expect(proxy(request("/account", "ll_auth=1"))?.status).toBe(307);
    expect(proxy(request("/accounts"))).toBeUndefined();
    expect(proxy(request("/login?next=%2Faccount"))).toBeUndefined();
  });

  it("still strips a trailing slash first, so /account/ lands on /account", () => {
    const res = proxy(request("/account/"))!;
    expect(res.status).toBe(308);
    expect(location(res)).toBe(`${ORIGIN}/account`);
  });

  it("runs on /account pages but not on the rest of the site", () => {
    for (const url of ["/account", "/account/kits/abc", "/account?billing=error"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true);
    for (const url of ["/", "/login", "/kit/abc", "/accounts", "/pricing"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(false);
  });
});

describe("proxy: the mock checkout in production", () => {
  const rewrite = (res: Response | undefined) => res?.headers.get("x-middleware-rewrite");

  it.each(["/checkout/mock", "/checkout/mock?product=kit&kitId=AKWq8__P15_kweHmfXX_Uw"])("rewrites %s to a path no route matches, so Next answers 404", (path) => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(rewrite(proxy(request(path)))).toMatch(/^https:\/\/launchloop\.dev\/_not-found-checkout-mock(\?|$)/);
  });

  it.each(["preview", "development", ""])("lets VERCEL_ENV=%j through to the page", (vercelEnv) => {
    vi.stubEnv("VERCEL_ENV", vercelEnv);
    expect(proxy(request("/checkout/mock?product=kit"))).toBeUndefined();
  });

  it("only touches /checkout/mock itself", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    for (const path of ["/checkout/success?session_id=x", "/api/checkout/mock", "/checkout/mocks"]) expect(proxy(request(path)), path).toBeUndefined();
  });

  it("the matcher sends /checkout/mock through the proxy", () => {
    for (const url of ["/checkout/mock", "/checkout/mock?product=kit"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true);
    for (const url of ["/checkout/success", "/api/checkout/mock"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(false);
  });
});
