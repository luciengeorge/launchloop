import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ safeFetch: vi.fn() }));
vi.mock("@/lib/ingest/safe-fetch", async (orig) => ({ ...(await orig<typeof import("@/lib/ingest/safe-fetch")>()), safeFetch: m.safeFetch }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn(), normaliseErrorMessage: (e: unknown) => String(e) }));

const { githubRepoLink, isGitHubOwner, isGitHubRepoName, parseGitHubUrl, repoApiPath, fetchRepo } = await import("@/lib/ingest/github");
const { fetchSite } = await import("@/lib/ingest/site");
const { ingest, IngestError } = await import("@/lib/ingest");

const TRAVERSALS = [
  "https://github.com/../user",
  "https://github.com/../..",
  "https://github.com/x/..",
  "https://github.com/x/.",
  "https://github.com/./x/y",
  "https://github.com/a/b/../c",
  "https://github.com/%2e%2e/user",
  "https://github.com/%2E%2e/user",
  "https://github.com/.%2e/user",
  "https://github.com/x/%2e%2e",
  "https://github.com/..%2fuser/repo",
  "https://github.com/x/..%2f..%2fuser",
  "https://github.com/%2e%2e%2fuser/repo",
  "https://github.com\\..\\user",
  "https://github.com/.\t./user",
  "github.com/../user",
];

/** Every request the code makes through the global fetch (GitHub's API and raw files). */
function recordFetches() {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      calls.push(String(input));
      return new Response("{}", { status: 404 });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  m.safeFetch.mockReset();
});

describe("GitHub names", () => {
  it.each(["a", "A1", "vercel", "fixture-labs", "a-b-c", "x".repeat(39)])("owner %s is valid", (owner) => {
    expect(isGitHubOwner(owner)).toBe(true);
  });

  it.each(["", "-a", "a-", "a--b", "a_b", "a.b", "x".repeat(40), "..", "a%2fb"])("owner %j is invalid", (owner) => {
    expect(isGitHubOwner(owner)).toBe(false);
  });

  it.each(["r", "next.js", "my_app", "a-b.c_d", "...", ".github", "x".repeat(100)])("repo %s is valid", (name) => {
    expect(isGitHubRepoName(name)).toBe(true);
  });

  it.each(["", ".", "..", "a/b", "a b", "a%2e", "x".repeat(101)])("repo %j is invalid", (name) => {
    expect(isGitHubRepoName(name)).toBe(false);
  });
});

describe("parseGitHubUrl", () => {
  it.each(TRAVERSALS)("refuses the dot segment in %j", (input) => {
    expect(parseGitHubUrl(input)).toBeNull();
  });

  it.each([
    ["github.com/sindresorhus/got", "sindresorhus", "got"],
    ["https://github.com/vercel/next.js", "vercel", "next.js"],
    ["https://www.github.com/vercel/next.js/tree/canary", "vercel", "next.js"],
    ["git+https://github.com/me/my_app.git", "me", "my_app"],
    ["HTTPS://GitHub.com/Me/App?tab=readme#top", "Me", "App"],
    ["https://github.com/fixture-labs/pulse/", "fixture-labs", "pulse"],
    ["https://github.com/a/.github", "a", ".github"],
    [`https://github.com/${"o".repeat(39)}/${"r".repeat(100)}`, "o".repeat(39), "r".repeat(100)],
  ])("%s is %s/%s", (input, owner, name) => {
    expect(parseGitHubUrl(input)).toEqual({ owner, name });
  });

  it.each(["https://github.com/-bad/repo", "https://github.com/a--b/repo", "https://github.com/a_b/repo", "https://gitlab.com/a/b", "https://evilgithub.com/a/b", "https://github.com.evil.dev/a/b"])(
    "refuses %s",
    (input) => {
      expect(parseGitHubUrl(input)).toBeNull();
    },
  );
});

describe("repoApiPath", () => {
  it("encodes both names", () => {
    expect(repoApiPath("vercel", "next.js")).toBe("/repos/vercel/next.js");
  });

  it.each([
    ["..", "user"],
    ["x", ".."],
    ["a/b", "c"],
    ["a", "b/../../user"],
  ])("throws invalid_url for %s/%s instead of building a path", (owner, name) => {
    expect(() => repoApiPath(owner, name)).toThrow(expect.objectContaining({ code: "invalid_url" }));
  });

  it("fetchRepo refuses an invalid name without calling GitHub", async () => {
    const calls = recordFetches();
    await expect(fetchRepo("..", "user", [])).rejects.toMatchObject({ code: "invalid_url" });
    expect(calls).toEqual([]);
  });
});

describe("pasted traversal links", () => {
  it.each(["https://github.com/../user", "github.com/%2e%2e/user", "https://github.com/x/..%2f..%2fuser", "github.com/../user/repo"])(
    "%s is rejected before any GitHub request",
    async (input) => {
      const calls = recordFetches();
      const error = await ingest(input).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(IngestError);
      expect(calls.filter((c) => c.includes("github"))).toEqual([]);
    },
  );
});

describe("scraped GitHub links", () => {
  const page = (href: string) => ({
    url: "https://user.example.dev/",
    status: 200,
    contentType: "text/html",
    text: `<!doctype html><html><head><title>User</title></head><body><main><p>User keeps your team's weekly notes in one tidy place you can search.</p></main><footer><a href="${href}">GitHub</a></footer></body></html>`,
  });

  it.each(TRAVERSALS.filter((t) => t.startsWith("http")))("%j on a page is ignored", async (href) => {
    m.safeFetch.mockResolvedValue(page(href));
    expect((await fetchSite("https://user.example.dev/", [])).githubUrl).toBeUndefined();
  });

  it("a page linking to github.com/../user never reaches GitHub's /user endpoint", async () => {
    m.safeFetch.mockResolvedValue(page("https://github.com/../user"));
    const calls = recordFetches();
    const kit = await ingest("https://user.example.dev/");
    expect(kit.repo).toBeUndefined();
    expect(calls.filter((c) => c.includes("github"))).toEqual([]);
  });

  it.each([
    ["https://github.com/me/myapp", "https://github.com/me/myapp"],
    ["https://github.com/me/myapp/", "https://github.com/me/myapp/"],
    ["HTTPS://WWW.GITHUB.COM/me/my.app", "https://www.github.com/me/my.app"],
  ])("%s is kept, normalised", (href, expected) => {
    expect(githubRepoLink(href)).toBe(expected);
  });

  it.each(["https://github.com/me", "https://github.com/me/myapp/issues", "https://github.com/me/myapp?tab=readme", "//github.com/me/myapp", "javascript:github.com/me/myapp"])(
    "%s isn't a repo link",
    (href) => {
      expect(githubRepoLink(href)).toBeUndefined();
    },
  );
});
