import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RepoData } from "@/lib/ingest/github";
import type { SiteData } from "@/lib/ingest/site";

const m = vi.hoisted(() => ({ fetchSite: vi.fn(), fetchRepo: vi.fn(), findRepoByName: vi.fn(), discoverVisuals: vi.fn(), sentryCapture: vi.fn() }));
vi.mock("@/lib/ingest/site", () => ({ fetchSite: m.fetchSite }));
vi.mock("@/lib/ingest/visuals", () => ({ discoverVisuals: m.discoverVisuals }));
vi.mock("@/lib/ingest/github", async (orig) => ({ ...(await orig<typeof import("@/lib/ingest/github")>()), fetchRepo: m.fetchRepo, findRepoByName: m.findRepoByName }));
vi.mock("@/lib/ingest/repo-palette", () => ({ fetchRepoPalette: vi.fn(async () => ({ source: "default" })) }));
vi.mock("@/lib/kit-tracing", () => ({ phase: (_n: string, _o: string, _a: unknown, fn: () => unknown) => fn() }));
// The real observability module, so the throttle is exercised; only the SDK underneath is faked.
vi.mock("@sentry/nextjs", () => ({ captureException: m.sentryCapture }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { ingest } = await import("@/lib/ingest");

// What a Vite/CRA app serves before JS runs (tool4boxology.service.tib.eu, 21 Oct): a <title> and an empty #root.
const emptySpa = (url: string, title = "Tool4Boxology"): SiteData => ({ url, title, headings: [], paragraphs: [], listItems: [], prices: [], css: "" });
const repo = (owner: string, name: string, homepage?: string) => ({ owner, name, url: `https://github.com/${owner}/${name}`, homepage, commits: [], headSha: "abc" }) as unknown as RepoData;

beforeEach(() => {
  m.findRepoByName.mockResolvedValue(null);
  m.discoverVisuals.mockResolvedValue({});
});

describe("ingest: a site URL whose page has no readable text", () => {
  it("builds from the one repo named like the host", async () => {
    m.fetchSite.mockResolvedValue(emptySpa("https://tool4boxology.service.tib.eu/"));
    m.findRepoByName.mockImplementation(async (n: string) => (n === "tool4boxology" ? { owner: "SDM-TIB", name: "Tool4Boxology" } : null));
    m.fetchRepo.mockResolvedValue(repo("SDM-TIB", "Tool4Boxology"));
    const result = await ingest("https://tool4boxology.service.tib.eu");
    expect(result.primary).toBe("repo");
    expect(result.repo?.url).toBe("https://github.com/SDM-TIB/Tool4Boxology");
    // The title names the same repo as the host, so it isn't searched again.
    expect(m.findRepoByName).toHaveBeenCalledTimes(1);
  });

  it("uses the page's own GitHub link before searching", async () => {
    m.fetchSite.mockResolvedValue({ ...emptySpa("https://myapp.dev/", "My App"), githubUrl: "https://github.com/me/myapp" });
    m.fetchRepo.mockResolvedValue(repo("me", "myapp"));
    expect((await ingest("myapp.dev")).repo?.name).toBe("myapp");
    expect(m.findRepoByName).not.toHaveBeenCalled();
  });

  it("still fails with site_no_content when no repo matches the site", async () => {
    m.fetchSite.mockResolvedValue(emptySpa("https://acme.io/", "Acme"));
    m.findRepoByName.mockResolvedValue({ owner: "someone", name: "other-thing" });
    m.fetchRepo.mockResolvedValue(repo("someone", "other-thing", "https://elsewhere.com"));
    await expect(ingest("acme.io")).rejects.toMatchObject({ code: "site_no_content" });
  });

  it("still fails with site_no_content when nothing is found", async () => {
    m.fetchSite.mockResolvedValue(emptySpa("https://acme.io/", "Rocket Skates | Acme"));
    await expect(ingest("acme.io")).rejects.toMatchObject({ code: "site_no_content" });
    expect(m.findRepoByName.mock.calls).toEqual([["acme"], ["Rocket Skates"]]);
    expect(m.fetchRepo).not.toHaveBeenCalled();
  });
});

describe("ingest: kit visuals are best effort", () => {
  it("a visuals lookup that rejects or throws still ingests, with no visuals, and reaches Sentry once a minute per error type", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.fetchSite.mockResolvedValue(emptySpa("https://tool4boxology.service.tib.eu/"));
    m.findRepoByName.mockResolvedValue({ owner: "SDM-TIB", name: "Tool4Boxology" });
    m.fetchRepo.mockResolvedValue(repo("SDM-TIB", "Tool4Boxology"));
    const failures = [
      () => Promise.reject(new URIError("URI malformed")),
      () => {
        throw new URIError("URI malformed");
      },
      () => Promise.reject(new URIError("URI malformed")),
    ];
    for (const impl of failures) {
      m.discoverVisuals.mockImplementation(impl);
      const result = await ingest("https://tool4boxology.service.tib.eu");
      expect(result.repo?.name).toBe("Tool4Boxology");
      expect(result.visuals).toEqual({});
    }
    expect(m.sentryCapture).toHaveBeenCalledTimes(1);
    expect(m.sentryCapture).toHaveBeenCalledWith(expect.any(URIError), expect.objectContaining({ extra: expect.objectContaining({ stage: "ingest.visuals", throttleKey: "ingest.visuals:URIError" }) }));

    m.discoverVisuals.mockRejectedValue(new TypeError("boom"));
    await ingest("https://tool4boxology.service.tib.eu");
    expect(m.sentryCapture).toHaveBeenCalledTimes(2);
    expect(m.sentryCapture).toHaveBeenLastCalledWith(expect.any(TypeError), expect.objectContaining({ extra: expect.objectContaining({ throttleKey: "ingest.visuals:TypeError" }) }));
  });
});
