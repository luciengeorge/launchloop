import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));

const { captureExceptionThrottled } = await import("@/lib/observability");
const { clientIp, freePreviewGate, ipv6Prefix64 } = await import("@/lib/rate-limit");

/** The refusal the gate sends, or null when it lets the request through. */
const gate = async (req: Request, input: string) => (await freePreviewGate(req, input)).refused;
const { waitLabel } = await import("@/lib/errors");

const request = (ip: string) => new Request("http://localhost/api/kits", { method: "POST", headers: { "x-forwarded-for": ip } });
const REPO = "https://github.com/acme/app";
let mem: MemoryStore;

beforeEach(() => {
  mem = new MemoryStore();
  kv.store = mem;
});

describe("kill switch", () => {
  it("FREE_PREVIEWS_DISABLED=1 refuses with the friendly busy message and consumes nothing", async () => {
    vi.stubEnv("FREE_PREVIEWS_DISABLED", "1");
    const res = await gate(request("203.0.113.1"), REPO);
    expect(res?.status).toBe(503);
    expect(await res?.json()).toMatchObject({ code: "busy", error: "LaunchLoop is very busy right now, try again in a bit." });
    expect(mem.keys()).toEqual([]);
  });

  it("any other value leaves previews on", async () => {
    vi.stubEnv("FREE_PREVIEWS_DISABLED", "0");
    expect(await gate(request("203.0.113.1"), REPO)).toBeNull();
  });
});

describe("global daily cap", () => {
  it("returns 503 busy once the day's previews across all IPs pass PREVIEW_GLOBAL_DAILY_CAP", async () => {
    vi.stubEnv("PREVIEW_GLOBAL_DAILY_CAP", "3");
    for (const ip of ["198.51.100.1", "198.51.100.2", "198.51.100.3"]) expect(await gate(request(ip), REPO)).toBeNull();
    const res = await gate(request("198.51.100.4"), REPO);
    expect(res?.status).toBe(503);
    expect((await res?.json()).code).toBe("busy");
    expect(mem.keys()).toContain(`cap:previews:${new Date().toISOString().slice(0, 10)}`);
  });

  it("requests refused by the per-IP limit don't use up the global cap", async () => {
    vi.stubEnv("PREVIEW_GLOBAL_DAILY_CAP", "11");
    const statuses = [];
    for (let i = 0; i < 15; i++) statuses.push((await gate(request("198.51.100.9"), REPO))?.status ?? 200);
    expect(statuses).toEqual([...Array(10).fill(200), ...Array(5).fill(429)]);
    expect(await gate(request("198.51.100.10"), REPO)).toBeNull();
  });

  it("defaults to 1500 when unset or malformed", async () => {
    vi.stubEnv("PREVIEW_GLOBAL_DAILY_CAP", "lots");
    const day = new Date().toISOString().slice(0, 10);
    await mem.set(`cap:previews:${day}`, 1499);
    expect(await gate(request("192.0.2.1"), REPO)).toBeNull();
    expect((await gate(request("192.0.2.2"), REPO))?.status).toBe(503);
  });
});

describe("what counts", () => {
  it("invalid input is refused with 422 before a slot is used", async () => {
    const res = await gate(request("192.0.2.5"), "not a url");
    expect(res?.status).toBe(422);
    expect((await res?.json()).code).toBe("invalid_url");
    expect(mem.keys()).toEqual([]);
  });

  it("the sample app counts against neither limit", async () => {
    for (let i = 0; i < 30; i++) expect(await gate(request("192.0.2.6"), i % 2 ? "sample" : " Sample ")).toBeNull();
    expect(mem.keys()).toEqual([]);
  });
});

describe("refunds and refused attempts", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T13:10:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const take = async (ip: string) => {
    const result = await freePreviewGate(request(ip), REPO);
    if (result.refused) throw new Error(`refused with ${result.refused.status}`);
    return result.slot;
  };

  it("a refunded slot can be used again", async () => {
    for (let i = 0; i < 9; i++) await take("192.0.2.20");
    const failed = await take("192.0.2.20");
    await failed.refund();
    await take("192.0.2.20");
    expect((await gate(request("192.0.2.20"), REPO))?.status).toBe(429);
  });

  it("refunding the same slot twice gives back one slot", async () => {
    for (let i = 0; i < 9; i++) await take("192.0.2.21");
    const failed = await take("192.0.2.21");
    await failed.refund();
    await failed.refund();
    await take("192.0.2.21");
    expect((await gate(request("192.0.2.21"), REPO))?.status).toBe(429);
  });

  it("only the first 10 failures an hour are refunded, so missing repos can't hammer GitHub", async () => {
    for (let i = 0; i < 10; i++) await (await take("192.0.2.22")).refund();
    // The 11th failure isn't refunded: it uses one of the 10.
    await (await take("192.0.2.22")).refund();
    for (let i = 0; i < 9; i++) await take("192.0.2.22");
    expect((await gate(request("192.0.2.22"), REPO))?.status).toBe(429);
  });

  it("the refund allowance resets with the hour, and the day caps it at 30", async () => {
    for (let hour = 13; hour < 16; hour++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, hour, 10)));
      for (let i = 0; i < 10; i++) await (await take("192.0.2.23")).refund();
    }
    vi.setSystemTime(new Date("2026-10-19T16:10:00Z"));
    await (await take("192.0.2.23")).refund();
    for (let i = 0; i < 9; i++) await take("192.0.2.23");
    expect((await gate(request("192.0.2.23"), REPO))?.status).toBe(429);
  });

  it("a refund after the window ended doesn't credit the next window", async () => {
    const slot = await take("192.0.2.24");
    vi.setSystemTime(new Date("2026-10-19T14:02:00Z"));
    for (let i = 0; i < 10; i++) await take("192.0.2.24");
    await slot.refund();
    expect((await gate(request("192.0.2.24"), REPO))?.status).toBe(429);
  });

  it("retrying while limited doesn't eat into the day's 40", async () => {
    for (let i = 0; i < 10; i++) await take("192.0.2.25");
    for (let i = 0; i < 30; i++) expect((await gate(request("192.0.2.25"), REPO))?.status).toBe(429);
    for (let hour = 14; hour < 17; hour++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, hour, 10)));
      for (let i = 0; i < 10; i++) await take("192.0.2.25");
    }
    vi.setSystemTime(new Date("2026-10-19T17:10:00Z"));
    const res = await gate(request("192.0.2.25"), REPO);
    expect(res?.status).toBe(429);
    // The day's 40 are used, so it's the daily window: UTC midnight is 6h50m away.
    expect((await res?.json()).retryAfterSeconds).toBe(6 * 3600 + 50 * 60);
  });

  it("a request refused as busy by the global cap gives its per-IP slot back", async () => {
    vi.stubEnv("PREVIEW_GLOBAL_DAILY_CAP", "0");
    for (let i = 0; i < 8; i++) expect((await gate(request("192.0.2.26"), REPO))?.status).toBe(503);
    vi.stubEnv("PREVIEW_GLOBAL_DAILY_CAP", "1000");
    for (let i = 0; i < 10; i++) await take("192.0.2.26");
    expect((await gate(request("192.0.2.26"), REPO))?.status).toBe(429);
  });

  it("'Try again in' counts down to the end of the hour between attempts", async () => {
    for (let i = 0; i < 10; i++) await take("192.0.2.27");
    vi.setSystemTime(new Date("2026-10-19T13:18:00Z"));
    const first = await gate(request("192.0.2.27"), REPO);
    vi.setSystemTime(new Date("2026-10-19T13:23:30Z"));
    const second = await gate(request("192.0.2.27"), REPO);
    expect(first?.headers.get("Retry-After")).toBe(String(42 * 60));
    expect(second?.headers.get("Retry-After")).toBe(String(36 * 60 + 30));
    expect((await first?.json()).fix).toContain("Try again in 42 min");
    expect((await second?.json()).fix).toContain("Try again in 37 min");
  });

  it("a refund that can't reach the store is reported, not thrown", async () => {
    const slot = await take("192.0.2.28");
    mem.failing = true;
    await expect(slot.refund()).resolves.toBeUndefined();
    expect(captureExceptionThrottled).toHaveBeenCalledWith("rate-limit.refund", expect.any(Error), { stage: "rate-limit.refund" });
  });
});

describe("store failures", () => {
  it("fails closed with busy and reports to Sentry when Upstash errors", async () => {
    mem.failing = true;
    const res = await gate(request("192.0.2.7"), REPO);
    expect(res?.status).toBe(503);
    expect((await res?.json()).code).toBe("busy");
    expect(captureExceptionThrottled).toHaveBeenCalledWith("rate-limit.store", expect.objectContaining({ message: "KV command failed with 503" }), { stage: "rate-limit.store" });
  });
});

describe("IPv6 keys", () => {
  it("cuts addresses to their /64", () => {
    expect(ipv6Prefix64("2001:db8:a:b:1:2:3:4")).toBe("2001:db8:a:b::/64");
    expect(ipv6Prefix64("2001:DB8:000A:b::9")).toBe("2001:db8:a:b::/64");
    expect(ipv6Prefix64("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(ipv6Prefix64("::1")).toBe("0:0:0:0::/64");
    expect(ipv6Prefix64("[2001:db8:a:b::1]")).toBe("2001:db8:a:b::/64");
    expect(ipv6Prefix64("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
    expect(ipv6Prefix64("64:ff9b::192.0.2.1")).toBe("64:ff9b:0:0::/64");
    expect(ipv6Prefix64("::ffff:192.0.2.1")).toBe("192.0.2.1");
    expect(ipv6Prefix64("not:an:ip")).toBe("not:an:ip");
  });

  it("clientIp keys IPv6 by /64 and leaves IPv4 alone", () => {
    expect(clientIp(request("2001:db8:a:b:ffff::1, 10.0.0.1"))).toBe("2001:db8:a:b::/64");
    expect(clientIp(request("203.0.113.9"))).toBe("203.0.113.9");
  });

  it("addresses in one /64 share a budget", async () => {
    const statuses = [];
    for (let i = 1; i <= 11; i++) statuses.push((await gate(request(`2001:db8:5:6::${i.toString(16)}`), REPO))?.status ?? 200);
    expect(statuses).toEqual([...Array(10).fill(200), 429]);
    expect(await gate(request("2001:db8:5:7::1"), REPO)).toBeNull();
  });
});

describe("waitLabel", () => {
  it("rounds up to minutes, then hours", () => {
    expect(waitLabel(1)).toBe("1 min");
    expect(waitLabel(1380)).toBe("23 min");
    expect(waitLabel(3600)).toBe("60 min");
    expect(waitLabel(5 * 3600)).toBe("5 hours");
  });
});
