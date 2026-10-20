import { createServer, type Server } from "node:http";
import net, { type AddressInfo } from "node:net";
import type * as UndiciModule from "undici";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const dns = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: dns.lookup, default: { lookup: dns.lookup } }));

const undiciFetch = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("undici", async (importOriginal) => ({ ...(await importOriginal<typeof UndiciModule>()), fetch: undiciFetch.fetch }));

const { Agent, Response, fetch: realFetch } = await vi.importActual<typeof UndiciModule>("undici");
const { safeFetch, isPrivateIp, pinnedLookup } = await import("@/lib/ingest/safe-fetch");

const PUBLIC_V4 = "93.184.215.14";

function resolvesTo(...addresses: string[]) {
  return addresses.map((address) => ({ address, family: net.isIP(address) }));
}

async function blockedCode(url: string): Promise<string | undefined> {
  try {
    await safeFetch(url);
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

beforeEach(() => {
  dns.lookup.mockReset();
  undiciFetch.fetch.mockReset();
  undiciFetch.fetch.mockImplementation(async () => new Response("<html>ok</html>", { status: 200, headers: { "content-type": "text/html" } }));
});

describe("isPrivateIp", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "198.18.0.1",
    "224.0.0.1", "255.255.255.255", "::", "::1", "::ffff:7f00:1", "::ffff:127.0.0.1", "::ffff:a9fe:a9fe", "::7f00:1",
    "64:ff9b::7f00:1", "2002:7f00:1::", "fc00::1", "fd12::1", "fe80::1", "fe90::1", "febf::1", "fec0::1", "ff02::1",
    "fe80::1%eth0", "not-an-ip",
  ])("blocks %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each([PUBLIC_V4, "8.8.8.8", "2606:4700::1111", "2001:4860:4860::8888", "::ffff:5db8:d70e"])("allows %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});

describe("safeFetch address validation", () => {
  it.each([
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/",
    "http://[::127.0.0.1]/",
    "http://[::ffff:169.254.169.254]/",
    "http://[64:ff9b::7f00:1]/",
    "http://[2002:7f00:1::]/",
    "http://[fe90::1]/",
    "http://[ff02::1]/",
    "http://[::]/",
    "http://[::1]/",
    "http://127.0.0.1/",
    "http://0.0.0.0/",
    "http://169.254.169.254/latest/meta-data/",
    "http://2130706433/",
    "http://0x7f000001/",
    "http://localhost/",
  ])("blocks %s without fetching", async (url) => {
    expect(await blockedCode(url)).toBe("site_blocked");
    expect(undiciFetch.fetch).not.toHaveBeenCalled();
  });

  it("blocks a hostname that resolves to a private address", async () => {
    dns.lookup.mockResolvedValue(resolvesTo("10.0.0.5"));
    expect(await blockedCode("https://internal.example.com/")).toBe("site_blocked");
    expect(undiciFetch.fetch).not.toHaveBeenCalled();
  });

  it("blocks a hostname when any resolved address is private", async () => {
    dns.lookup.mockResolvedValue(resolvesTo(PUBLIC_V4, "::1"));
    expect(await blockedCode("https://mixed.example.com/")).toBe("site_blocked");
  });

  it("blocks a redirect to a private address", async () => {
    dns.lookup.mockResolvedValue(resolvesTo(PUBLIC_V4));
    undiciFetch.fetch.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "http://[::ffff:127.0.0.1]/admin" } }));
    expect(await blockedCode("https://example.com/")).toBe("site_blocked");
    expect(undiciFetch.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([`http://${PUBLIC_V4}/`, "http://[2606:4700::1111]/"])("fetches public address %s through a pinned dispatcher", async (url) => {
    const page = await safeFetch(url);
    expect(page).toMatchObject({ status: 200, text: "<html>ok</html>", contentType: "text/html" });
    const [target, init] = undiciFetch.fetch.mock.calls[0];
    expect(String(target)).toBe(url);
    expect(init.dispatcher).toBeInstanceOf(Agent);
    expect(init.headers["User-Agent"]).toMatch(/^LaunchLoopBot\//);
  });

  it("sends origin-bound headers to the first origin only, never across a redirect", async () => {
    dns.lookup.mockResolvedValue(resolvesTo(PUBLIC_V4));
    undiciFetch.fetch
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/moved" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://cdn.example.net/file" } }));
    await safeFetch("https://api.example.com/start", { headers: { "X-Api-Version": "1" }, originHeaders: { Authorization: "Bearer secret" } });
    const headers = undiciFetch.fetch.mock.calls.map(([target, init]) => [String(target), init.headers.Authorization, init.headers["X-Api-Version"]]);
    expect(headers).toEqual([
      ["https://api.example.com/start", "Bearer secret", "1"],
      ["https://api.example.com/moved", "Bearer secret", "1"],
      ["https://cdn.example.net/file", undefined, "1"],
    ]);
  });

  it("fetches an ordinary https site by hostname", async () => {
    dns.lookup.mockResolvedValue(resolvesTo(PUBLIC_V4, "2606:4700::1111"));
    const page = await safeFetch("https://example.com/");
    expect(page.url).toBe("https://example.com/");
    expect(String(undiciFetch.fetch.mock.calls[0][0])).toBe("https://example.com/");
  });
});

describe("pinnedLookup", () => {
  it("answers with the validated addresses only for the validated hostname", () => {
    const lookup = pinnedLookup("example.com", resolvesTo(PUBLIC_V4));
    const single = vi.fn();
    lookup("example.com", {}, single);
    expect(single).toHaveBeenCalledWith(null, PUBLIC_V4, 4);
    const all = vi.fn();
    lookup("example.com", { all: true }, all);
    expect(all).toHaveBeenCalledWith(null, resolvesTo(PUBLIC_V4));
    const other = vi.fn();
    lookup("evil.example", {}, other);
    expect(other.mock.calls[0][0]).toMatchObject({ code: "EBLOCKED" });
  });

  it("refuses private addresses even if handed one", () => {
    const callback = vi.fn();
    pinnedLookup("example.com", resolvesTo("127.0.0.1"))("example.com", { all: true }, callback);
    expect(callback.mock.calls[0][0]).toMatchObject({ code: "EBLOCKED" });
  });
});

describe("DNS rebinding", () => {
  let server: Server;
  let port: number;
  const dialed: string[] = [];
  const realConnect = net.connect;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/redirect") {
        res.writeHead(302, { location: "/next", connection: "close" }).end();
        return;
      }
      res.writeHead(200, { "content-type": "text/plain" }).end(`served ${req.url}`);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    dialed.length = 0;
    undiciFetch.fetch.mockImplementation(realFetch);
    // Stands in for the network: records the IP each socket would dial, then talks to the local test server.
    vi.spyOn(net, "connect").mockImplementation(((options: net.NetConnectOpts & { host: string; lookup?: net.LookupFunction }) => {
      if (!options.lookup) throw new Error("connection opened without the pinned lookup");
      options.lookup(options.host, { all: true }, (error, addresses) => {
        if (error) throw error;
        for (const a of addresses as unknown as { address: string }[]) dialed.push(a.address);
      });
      return realConnect({ host: "127.0.0.1", port });
    }) as typeof net.connect);
  });

  it("connects to the validated IP even when DNS changes to a private one", async () => {
    dns.lookup.mockResolvedValueOnce(resolvesTo(PUBLIC_V4)).mockResolvedValue(resolvesTo("127.0.0.1"));
    const page = await safeFetch(`http://rebind.example:${port}/page`);
    expect(page.text).toBe("served /page");
    expect(dns.lookup).toHaveBeenCalledTimes(1);
    expect(dialed).toEqual([PUBLIC_V4]);
  });

  it("blocks a redirect hop whose fresh lookup returns a private IP", async () => {
    dns.lookup.mockResolvedValueOnce(resolvesTo(PUBLIC_V4)).mockResolvedValue(resolvesTo("127.0.0.1"));
    expect(await blockedCode(`http://rebind.example:${port}/redirect`)).toBe("site_blocked");
    expect(dns.lookup).toHaveBeenCalledTimes(2);
    expect(dialed).toEqual([PUBLIC_V4]);
    expect(dialed).not.toContain("127.0.0.1");
  });
});
