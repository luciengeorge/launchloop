import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", async (importOriginal) => ({ ...(await importOriginal<object>()), captureExceptionThrottled: vi.fn() }));

const { SESSION_COOKIE } = await import("@/lib/auth");
const { kitExists, kitPageExists } = await import("@/lib/kit-exists");
const { captureExceptionThrottled } = await import("@/lib/observability");
const { KIT_LOOKUP_TIMEOUT_MS, config, proxy } = await import("@/proxy");

const ORIGIN = "https://launchloop.dev";
const KIT_ID = "AKWq8__P15_kweHmfXX_Uw";
/** A path no route matches, so Next answers with the root not-found page and a 404. */
const NOT_FOUND = `${ORIGIN}/_not-found-rewrite`;
let mem: MemoryStore;

beforeEach(async () => {
  mem = new MemoryStore();
  kv.store = mem;
  await mem.set(`kit:${KIT_ID}`, { id: KIT_ID });
});

function request(path: string, cookie?: string) {
  return new NextRequest(`${ORIGIN}${path}`, { headers: cookie ? { cookie } : {} });
}

const location = (res: Response) => res.headers.get("location");
const rewrite = (res: Response | undefined) => res?.headers.get("x-middleware-rewrite");

describe("proxy: logged-out /account redirect", () => {
  it.each([
    ["/account", "/login?next=%2Faccount"],
    ["/account?billing=error", "/login?next=%2Faccount%3Fbilling%3Derror"],
    [`/account/kits/${KIT_ID}`, `/login?next=%2Faccount%2Fkits%2F${KIT_ID}`],
  ])("sends %s without a session cookie to %s with a 307", async (path, target) => {
    const res = (await proxy(request(path)))!;
    expect(res.status).toBe(307);
    expect(location(res)).toBe(`${ORIGIN}${target}`);
  });

  it("encodes next the same way the page-level redirect does, so /login reads back the original path", async () => {
    const target = new URL(location((await proxy(request(`/account/kits/${KIT_ID}`)))!)!);
    expect(target.search).toBe(`?next=${encodeURIComponent(`/account/kits/${KIT_ID}`)}`);
    expect(target.searchParams.get("next")).toBe(`/account/kits/${KIT_ID}`);
  });

  it.each(["/account", `/account/kits/${KIT_ID}`])("lets %s through when a session cookie is present, even an unverified one", async (path) => {
    expect(await proxy(request(path, `${SESSION_COOKIE}=anything.signed`))).toBeUndefined();
  });

  it("treats an empty session cookie as logged out", async () => {
    expect((await proxy(request("/account", `${SESSION_COOKIE}=`)))?.status).toBe(307);
  });

  it("ignores other cookies and lookalike paths", async () => {
    expect((await proxy(request("/account", "ll_auth=1")))?.status).toBe(307);
    expect(await proxy(request("/accounts"))).toBeUndefined();
    expect(await proxy(request("/login?next=%2Faccount"))).toBeUndefined();
  });

  it("still strips a trailing slash first, so /account/ lands on /account", async () => {
    const res = (await proxy(request("/account/")))!;
    expect(res.status).toBe(308);
    expect(location(res)).toBe(`${ORIGIN}/account`);
  });

  it("runs on /account pages but not on the rest of the site", () => {
    for (const url of ["/account", "/account/kits/abc", "/account?billing=error"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true);
    for (const url of ["/", "/login", "/accounts", "/pricing"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(false);
  });
});

describe("proxy: the mock checkout in production", () => {
  it.each(["/checkout/mock", `/checkout/mock?product=kit&kitId=${KIT_ID}`])("rewrites %s to the 404 path", async (path) => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(rewrite(await proxy(request(path)))).toBe(NOT_FOUND);
  });

  it.each(["preview", "development", ""])("lets VERCEL_ENV=%j through to the page", async (vercelEnv) => {
    vi.stubEnv("VERCEL_ENV", vercelEnv);
    expect(await proxy(request("/checkout/mock?product=kit"))).toBeUndefined();
  });

  it("only touches /checkout/mock itself", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    for (const path of [`/checkout/success?kit=${KIT_ID}&session_id=x`, "/api/checkout/mock", "/checkout/mocks"]) expect(await proxy(request(path)), path).toBeUndefined();
  });

  it("the matcher sends /checkout/mock through the proxy", () => {
    for (const url of ["/checkout/mock", "/checkout/mock?product=kit"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "/api/checkout/mock" })).toBe(false);
  });
});

describe("proxy: unknown kit ids are a real 404", () => {
  const SIGNED_IN = `${SESSION_COOKIE}=anything.signed`;

  it("rewrites /kit/<unknown id> to the 404 path", async () => {
    for (const id of ["doesNotExist1234567", "short", "bad%20id%20that-is-long-enough"]) {
      expect(rewrite(await proxy(request(`/kit/${id}`))), id).toBe(NOT_FOUND);
    }
  });

  it("lets a saved kit and a preview that is still generating (or failed) through to the page", async () => {
    const pending = "PendingKit_1234567890";
    await mem.set(`kitpending:${pending}`, { state: "generating" }, 600);
    expect(await proxy(request(`/kit/${KIT_ID}`))).toBeUndefined();
    expect(await proxy(request(`/kit/${KIT_ID}?unlock=1`))).toBeUndefined();
    expect(await proxy(request(`/kit/${pending}`))).toBeUndefined();
  });

  it("a preview that has expired from the store is a 404", async () => {
    vi.useFakeTimers();
    try {
      await mem.set("kit:ExpiredPreview_12345", { id: "ExpiredPreview_12345" }, 60);
      expect(await proxy(request("/kit/ExpiredPreview_12345"))).toBeUndefined();
      vi.advanceTimersByTime(61_000);
      expect(rewrite(await proxy(request("/kit/ExpiredPreview_12345")))).toBe(NOT_FOUND);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rewrites a signed-in /account/kits/<unknown id> and /checkout/success with an unknown or missing kit to the 404 path", async () => {
    expect(rewrite(await proxy(request("/account/kits/doesNotExist1234567", SIGNED_IN)))).toBe(NOT_FOUND);
    for (const path of ["/checkout/success?kit=doesNotExist1234567&session_id=x", "/checkout/success", "/checkout/success?kit="]) {
      expect(rewrite(await proxy(request(path))), path).toBe(NOT_FOUND);
    }
    expect(await proxy(request(`/checkout/success?kit=${KIT_ID}`))).toBeUndefined();
  });

  it("lets the page decide when the store is down, instead of calling every kit missing, and reports it", async () => {
    mem.failing = true;
    expect(await proxy(request(`/kit/${KIT_ID}`))).toBeUndefined();
    expect(await proxy(request("/kit/doesNotExist1234567"))).toBeUndefined();
    expect(await proxy(request("/account/kits/doesNotExist1234567", SIGNED_IN))).toBeUndefined();
    expect(captureExceptionThrottled).toHaveBeenCalledTimes(3);
    expect(captureExceptionThrottled).toHaveBeenCalledWith("proxy.kit-exists", expect.objectContaining({ message: "KV command failed with 503" }), {
      pathname: "/kit/doesNotExist1234567",
    });
  });

  it("a store that never answers doesn't hold the page up: the proxy lets it through after KIT_LOOKUP_TIMEOUT_MS and reports a timeout", async () => {
    vi.spyOn(mem, "exists").mockImplementation(() => new Promise<boolean>(() => {}));
    const started = performance.now();
    expect(await proxy(request("/kit/doesNotExist1234567"))).toBeUndefined();
    const elapsed = performance.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(KIT_LOOKUP_TIMEOUT_MS - 50);
    expect(elapsed).toBeLessThan(KIT_LOOKUP_TIMEOUT_MS + 500);
    expect(captureExceptionThrottled).toHaveBeenCalledTimes(1);
    expect(captureExceptionThrottled).toHaveBeenCalledWith("proxy.kit-exists.timeout", expect.objectContaining({ name: "KitLookupTimeout" }), {
      pathname: "/kit/doesNotExist1234567",
      timeoutMs: KIT_LOOKUP_TIMEOUT_MS,
    });
  });

  it("a lookup that fails after the timeout has won leaves no unhandled rejection or timer behind", async () => {
    vi.useFakeTimers();
    try {
      let fail: (error: Error) => void = () => {};
      vi.spyOn(mem, "exists").mockImplementation(() => new Promise<boolean>((_, reject) => (fail = reject)));
      const result = proxy(request("/kit/doesNotExist1234567"));
      await vi.advanceTimersByTimeAsync(KIT_LOOKUP_TIMEOUT_MS);
      expect(await result).toBeUndefined();
      fail(new Error("KV command failed with 503"));
      // Vitest fails the run on an unhandled rejection; give one a chance to surface.
      await vi.advanceTimersByTimeAsync(0);
      expect(captureExceptionThrottled).toHaveBeenCalledTimes(1);

      // A lookup that answers in time clears its timer.
      vi.mocked(mem.exists).mockResolvedValue(true);
      expect(await proxy(request(`/kit/${KIT_ID}`))).toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a path that can't be decoded goes to the page rather than throwing in the proxy, and isn't reported", async () => {
    expect(await proxy(request("/kit/%E0%A4%A"))).toBeUndefined();
    expect(captureExceptionThrottled).not.toHaveBeenCalled();
  });

  it("/kit/<id>/<sub> isn't a kit page: the matcher skips it and no route matches it", async () => {
    for (const url of [`/kit/${KIT_ID}/sub`, "/kit/doesNotExist1234567/sub"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(false);
    const exists = vi.spyOn(mem, "exists");
    expect(await proxy(request("/kit/doesNotExist1234567/sub"))).toBeUndefined();
    expect(exists).not.toHaveBeenCalled();
  });

  it("/kit/<id>/ redirects to /kit/<id> first, for a real and an unknown id, without a store lookup", async () => {
    const exists = vi.spyOn(mem, "exists");
    for (const id of [KIT_ID, "doesNotExist1234567"]) {
      const res = (await proxy(request(`/kit/${id}/`)))!;
      expect(res.status).toBe(308);
      expect(location(res)).toBe(`${ORIGIN}/kit/${id}`);
    }
    expect(exists).not.toHaveBeenCalled();
  });

  it("the matcher runs on the kit pages and the success page only, not their APIs or images", () => {
    for (const url of ["/kit/abc", `/kit/${KIT_ID}?unlock=1`, "/checkout/success", "/checkout/success?kit=x"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true);
    for (const url of ["/kitchen", `/api/kits/${KIT_ID}/status`, `/api/og/${KIT_ID}/og`, "/example-kit", "/"]) expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(false);
  });
});

describe("kit existence checks", () => {
  it("kitExists only counts a saved kit; kitPageExists also counts a pending preview", async () => {
    await mem.set("kitpending:PendingKit_1234567890", { state: "failed" }, 600);
    expect(await kitExists(KIT_ID)).toBe(true);
    expect(await kitPageExists(KIT_ID)).toBe(true);
    expect(await kitExists("PendingKit_1234567890")).toBe(false);
    expect(await kitPageExists("PendingKit_1234567890")).toBe(true);
    expect(await kitPageExists("doesNotExist1234567")).toBe(false);
  });

  it("a saved kit costs one EXISTS; the pending key is only asked about when the kit isn't there", async () => {
    await mem.set("kitpending:PendingKit_1234567890", { state: "generating" }, 600);
    const exists = vi.spyOn(mem, "exists");
    expect(await kitPageExists(KIT_ID)).toBe(true);
    expect(exists.mock.calls).toEqual([[`kit:${KIT_ID}`]]);

    exists.mockClear();
    expect(await kitPageExists("PendingKit_1234567890")).toBe(true);
    expect(exists.mock.calls).toEqual([["kit:PendingKit_1234567890"], ["kitpending:PendingKit_1234567890"]]);

    exists.mockClear();
    expect(await proxy(request(`/kit/${KIT_ID}`))).toBeUndefined();
    expect(exists).toHaveBeenCalledTimes(1);
  });

  it("never asks the store about an id that can't be a kit", async () => {
    const exists = vi.spyOn(mem, "exists");
    for (const id of ["", "short", "../../etc/passwd_xx", "a".repeat(33)]) {
      expect(await kitExists(id)).toBe(false);
      expect(await kitPageExists(id)).toBe(false);
    }
    expect(exists).not.toHaveBeenCalled();
  });
});
