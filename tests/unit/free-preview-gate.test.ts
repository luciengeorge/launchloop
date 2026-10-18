import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));

const { freePreviewGate } = await import("@/lib/rate-limit");

const request = (ip: string) => new Request("http://localhost/api/kits", { method: "POST", headers: { "x-forwarded-for": ip } });
let mem: MemoryStore;

beforeEach(() => {
  mem = new MemoryStore();
  kv.store = mem;
});

describe("kill switch", () => {
  it("FREE_PREVIEWS_DISABLED=1 refuses with the friendly busy message and consumes nothing", async () => {
    vi.stubEnv("FREE_PREVIEWS_DISABLED", "1");
    const res = await freePreviewGate(request("203.0.113.1"));
    expect(res?.status).toBe(503);
    expect(await res?.json()).toMatchObject({ code: "busy", error: "LaunchLoop is very busy right now, try again in a bit." });
    expect(mem.keys()).toEqual([]);
  });

  it("any other value leaves previews on", async () => {
    vi.stubEnv("FREE_PREVIEWS_DISABLED", "0");
    expect(await freePreviewGate(request("203.0.113.1"))).toBeNull();
  });
});

describe("global daily cap", () => {
  it("returns 503 busy once the day's previews across all IPs pass PREVIEW_GLOBAL_DAILY_CAP", async () => {
    vi.stubEnv("PREVIEW_GLOBAL_DAILY_CAP", "3");
    for (const ip of ["198.51.100.1", "198.51.100.2", "198.51.100.3"]) expect(await freePreviewGate(request(ip))).toBeNull();
    const res = await freePreviewGate(request("198.51.100.4"));
    expect(res?.status).toBe(503);
    expect((await res?.json()).code).toBe("busy");
    expect(mem.keys()).toContain(`cap:previews:${new Date().toISOString().slice(0, 10)}`);
  });

  it("requests refused by the per-IP limit don't use up the global cap", async () => {
    vi.stubEnv("PREVIEW_GLOBAL_DAILY_CAP", "6");
    const statuses = [];
    for (let i = 0; i < 10; i++) statuses.push((await freePreviewGate(request("198.51.100.9")))?.status ?? 200);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429, 429, 429, 429]);
    expect(await freePreviewGate(request("198.51.100.10"))).toBeNull();
  });

  it("defaults to 1500 when unset or malformed", async () => {
    vi.stubEnv("PREVIEW_GLOBAL_DAILY_CAP", "lots");
    const day = new Date().toISOString().slice(0, 10);
    await mem.set(`cap:previews:${day}`, 1499);
    expect(await freePreviewGate(request("192.0.2.1"))).toBeNull();
    expect((await freePreviewGate(request("192.0.2.2")))?.status).toBe(503);
  });
});
