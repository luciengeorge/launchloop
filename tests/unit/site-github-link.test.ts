import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ safeFetch: vi.fn() }));
vi.mock("@/lib/ingest/safe-fetch", async (orig) => ({ ...(await orig<typeof import("@/lib/ingest/safe-fetch")>()), safeFetch: m.safeFetch }));

const { fetchSite } = await import("@/lib/ingest/site");

const page = (body: string) => ({ url: "https://myapp.dev/", status: 200, contentType: "text/html", text: `<!doctype html><html><head><title>My App</title></head><body>${body}</body></html>` });

describe("fetchSite: the page's GitHub link", () => {
  it("is found in the footer, which is stripped before reading the page's text", async () => {
    m.safeFetch.mockResolvedValue(page('<main><p>My App turns your notes into a weekly plan you can actually follow.</p></main><footer><a href="https://github.com/me/myapp">GitHub</a></footer>'));
    const site = await fetchSite("https://myapp.dev/", []);
    expect(site.githubUrl).toBe("https://github.com/me/myapp");
    expect(site.paragraphs.join(" ")).not.toContain("GitHub");
  });

  it("is found in the header nav", async () => {
    m.safeFetch.mockResolvedValue(page('<header><nav><a href="https://github.com/me/myapp/">Star us</a></nav></header><div id="root"></div>'));
    expect((await fetchSite("https://myapp.dev/", [])).githubUrl).toBe("https://github.com/me/myapp/");
  });
});
