import net from "node:net";
import type * as UndiciModule from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN = "unit-gh-token";
const PUBLIC_V4 = "93.184.215.14";

const m = vi.hoisted(() => ({ lookup: vi.fn(), undiciFetch: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: m.lookup, default: { lookup: m.lookup } }));
vi.mock("undici", async (orig) => ({ ...(await orig<typeof UndiciModule>()), fetch: m.undiciFetch }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn(), normaliseErrorMessage: (e: unknown) => String(e) }));

// env.ts reads GITHUB_TOKEN when it loads, so it is set before the first import.
vi.stubEnv("GITHUB_TOKEN", TOKEN);
const { Response: UndiciResponse } = await vi.importActual<typeof UndiciModule>("undici");
const { ingest } = await import("@/lib/ingest");

interface Seen {
  url: string;
  auth?: string;
  via: "gh" | "safeFetch";
}

type Route = (path: string) => { status?: number; body: string } | undefined;

/**
 * One fake GitHub behind both clients: the global fetch (gh() and raw files) and undici (safeFetch, used for the
 * visuals' tree listing and image probes). Every request is recorded with the Authorization header it carried.
 */
function fakeGitHub(route: Route) {
  const seen: Seen[] = [];
  const answer = (url: string) => {
    const path = url.replace(/^https:\/\/api\.github\.com/, "");
    const hit = route(path);
    return { status: hit?.status ?? (hit ? 200 : 404), body: hit?.body ?? "Not Found" };
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: { headers?: Record<string, string> }) => {
      const url = String(input);
      seen.push({ url, auth: init?.headers?.Authorization, via: "gh" });
      const { status, body } = answer(url);
      return new Response(body, { status });
    }),
  );
  m.undiciFetch.mockImplementation(async (input: string | URL, init?: { headers?: Record<string, string> }) => {
    const url = String(input);
    seen.push({ url, auth: init?.headers?.Authorization, via: "safeFetch" });
    const { status, body } = answer(url);
    return new UndiciResponse(body, { status });
  });
  return seen;
}

const META = "https://api.github.com/repos/acme/app";
const tree = JSON.stringify({ tree: [{ path: "public/manifest.json", mode: "100644", type: "blob" }] });

beforeEach(() => {
  m.lookup.mockResolvedValue([{ address: PUBLIC_V4, family: net.isIP(PUBLIC_V4) }]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  m.undiciFetch.mockReset();
});

describe("a repo whose metadata call is rate limited", () => {
  it("a private repo (403, raw files 404) fails, and nothing after the metadata call carries the token", async () => {
    const seen = fakeGitHub((p) => (p === "/repos/acme/app" ? { status: 403, body: "rate limited" } : undefined));
    await expect(ingest("https://github.com/acme/app")).rejects.toMatchObject({ code: "github_rate_limited" });
    // The metadata call is the one that would reveal `private`, so it is the only request allowed to carry the token.
    expect(seen.filter((r) => r.auth)).toEqual([{ url: META, auth: `Bearer ${TOKEN}`, via: "gh" }]);
    expect(seen.map((r) => r.url)).toEqual([META, "https://raw.githubusercontent.com/acme/app/HEAD/README.md", "https://raw.githubusercontent.com/acme/app/HEAD/package.json"]);
    expect(seen.filter((r) => r.url.includes("/git/trees/") || r.url.includes("/contents/"))).toEqual([]);
  });

  it.each([403, 429])("%i with readable raw files: the palette and tree listing still run, without the token", async (status) => {
    const seen = fakeGitHub((p) => {
      if (p === "/repos/acme/app") return { status, body: "rate limited" };
      if (p === "https://raw.githubusercontent.com/acme/app/HEAD/README.md") return { body: "# App\nApp keeps your team's weekly notes in one tidy, searchable place." };
      if (p === "https://raw.githubusercontent.com/acme/app/HEAD/package.json") return { body: JSON.stringify({ name: "app" }) };
      if (p === "/repos/acme/app/git/trees/HEAD?recursive=1") return { body: tree };
      if (p === "/repos/acme/app/contents/public/manifest.json") return { body: JSON.stringify({ theme_color: "#7c3aed" }) };
      return undefined;
    });
    const result = await ingest("https://github.com/acme/app");
    expect(result.repo?.visibilityUnverified).toBe(true);

    const treeCalls = seen.filter((r) => r.url.endsWith("/git/trees/HEAD?recursive=1"));
    expect(treeCalls.map((r) => r.via).sort()).toEqual(["gh", "safeFetch"]);
    expect(seen.some((r) => r.url.endsWith("/contents/public/manifest.json"))).toBe(true);
    expect(seen.filter((r) => r.auth).map((r) => r.url)).toEqual([META]);
  });

  it("a public repo read normally still sends the token to the palette and tree calls", async () => {
    const seen = fakeGitHub((p) => {
      if (p === "/repos/acme/app") return { body: JSON.stringify({ private: false, html_url: "https://github.com/acme/app", description: "App" }) };
      if (p === "/repos/acme/app/readme") return { body: "# App\nApp keeps your team's weekly notes in one tidy, searchable place." };
      if (p === "/repos/acme/app/git/trees/HEAD?recursive=1") return { body: tree };
      if (p === "/repos/acme/app/contents/public/manifest.json") return { body: JSON.stringify({ theme_color: "#7c3aed" }) };
      return undefined;
    });
    const result = await ingest("https://github.com/acme/app");
    expect(result.repo?.visibilityUnverified).toBeUndefined();
    const authed = seen.filter((r) => r.auth === `Bearer ${TOKEN}`).map((r) => `${r.via} ${r.url.replace("https://api.github.com", "")}`);
    expect(authed).toEqual(expect.arrayContaining(["gh /repos/acme/app/git/trees/HEAD?recursive=1", "safeFetch /repos/acme/app/git/trees/HEAD?recursive=1", "gh /repos/acme/app/contents/public/manifest.json"]));
  });
});
