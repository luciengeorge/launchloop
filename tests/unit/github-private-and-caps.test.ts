import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn(), normaliseErrorMessage: (e: unknown) => String(e) }));

const { fetchRepo } = await import("@/lib/ingest/github");
const { ingest } = await import("@/lib/ingest");
const { KIT_ERRORS, kitErrorBody } = await import("@/lib/errors");
const { DEFAULT_MAX_BYTES } = await import("@/lib/ingest/safe-fetch");

const API = "https://api.github.com";
const README_CAP = 12_000;

type Route = (path: string) => Response | undefined;

/** A fake GitHub over the global fetch. Records every path asked for; anything unrouted is a 404. */
function fakeGitHub(route: Route) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      const path = url.startsWith(API) ? url.slice(API.length) : url;
      calls.push(path);
      return route(path) ?? new Response("Not Found", { status: 404 });
    }),
  );
  return calls;
}

const repoMeta = (extra: Record<string, unknown> = {}) => Response.json({ html_url: "https://github.com/acme/app", description: "An app", stargazers_count: 3, ...extra });

/** An endless body that counts what was actually pulled from it. */
function endless(chunk = new Uint8Array(64 * 1024).fill(0x61)) {
  const stats = { pulled: 0, cancelled: false };
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      stats.pulled += chunk.byteLength;
      controller.enqueue(chunk);
    },
    cancel() {
      stats.cancelled = true;
    },
  });
  return { body, stats };
}

afterEach(() => vi.unstubAllGlobals());

describe("private repos", () => {
  it("stop at the repo's metadata: no README, package.json, commits or languages are fetched", async () => {
    const calls = fakeGitHub((p) => (p === "/repos/acme/secret" ? repoMeta({ private: true }) : Response.json({ sha: "leak" })));
    await expect(fetchRepo("acme", "secret", [])).rejects.toMatchObject({ code: "repo_private", userMessage: KIT_ERRORS.repo_private.title });
    expect(calls).toEqual(["/repos/acme/secret"]);
  });

  it("are refused through ingest too, with nothing read from the repo", async () => {
    const calls = fakeGitHub((p) => (p === "/repos/acme/secret" ? repoMeta({ private: true }) : undefined));
    await expect(ingest("https://github.com/acme/secret")).rejects.toMatchObject({ code: "repo_private" });
    expect(calls).toEqual(["/repos/acme/secret"]);
  });

  it("the message is friendly, has a way forward and no em-dash", () => {
    const body = kitErrorBody("repo_private");
    expect(body).toMatchObject({ code: "repo_private", error: "That repo is private, so we didn't read it." });
    expect(body.fix).toMatch(/Paste your live site URL instead/);
    expect(`${body.error} ${body.fix}`).not.toMatch(/[\u2014]/);
  });

  it("public repos (private: false) are read as before", async () => {
    fakeGitHub((p) => {
      if (p === "/repos/acme/app") return repoMeta({ private: false });
      if (p === "/repos/acme/app/readme") return new Response("# App\nDoes things.");
      if (p.startsWith("/repos/acme/app/commits")) return Response.json([{ sha: "abc123", commit: { message: "First", author: { date: "2026-01-01" } } }]);
      return undefined;
    });
    const repo = await fetchRepo("acme", "app", []);
    expect(repo).toMatchObject({ readme: "# App\nDoes things.", headSha: "abc123", url: "https://github.com/acme/app" });
  });
});

describe("GitHub response sizes", () => {
  it("an endless README is read only up to the cap and the download is cancelled", async () => {
    const readme = endless();
    fakeGitHub((p) => {
      if (p === "/repos/acme/app") return repoMeta();
      if (p === "/repos/acme/app/readme") return new Response(readme.body);
      return undefined;
    });
    const repo = await fetchRepo("acme", "app", []);
    expect(repo.readme).toHaveLength(README_CAP);
    expect(readme.stats.cancelled).toBe(true);
    expect(readme.stats.pulled).toBeLessThan(README_CAP * 4 + 4 * 64 * 1024);
  });

  it("commits past safe-fetch's default cap are dropped, not parsed whole", async () => {
    const huge = "[" + Array.from({ length: 20_000 }, (_, i) => JSON.stringify({ sha: `s${i}`, commit: { message: "x".repeat(80) } })).join(",") + "]";
    expect(huge.length).toBeGreaterThan(DEFAULT_MAX_BYTES);
    fakeGitHub((p) => {
      if (p === "/repos/acme/app") return repoMeta();
      if (p.startsWith("/repos/acme/app/commits")) return new Response(huge);
      return undefined;
    });
    const repo = await fetchRepo("acme", "app", []);
    expect(repo.commits).toEqual([]);
    expect(repo.headSha).toBeUndefined();
  });

  it("repo metadata that never ends is github_unavailable, not an out-of-memory", async () => {
    const meta = endless(new TextEncoder().encode('{"html_url":"' + "a".repeat(64 * 1024)));
    const calls = fakeGitHub((p) => (p === "/repos/acme/app" ? new Response(meta.body) : undefined));
    await expect(fetchRepo("acme", "app", [])).rejects.toMatchObject({ code: "github_unavailable" });
    expect(meta.stats.cancelled).toBe(true);
    expect(meta.stats.pulled).toBeLessThan(DEFAULT_MAX_BYTES + 4 * 64 * 1024);
    expect(calls).toEqual(["/repos/acme/app"]);
  });

  it("the raw fallback (API rate limited) caps the README the same way", async () => {
    const readme = endless();
    fakeGitHub((p) => {
      if (p === "/repos/acme/app") return new Response("rate limited", { status: 403 });
      if (p === "https://raw.githubusercontent.com/acme/app/HEAD/README.md") return new Response(readme.body);
      return undefined;
    });
    const repo = await fetchRepo("acme", "app", []);
    expect(repo.readme).toHaveLength(README_CAP);
    expect(readme.stats.cancelled).toBe(true);
  });
});
