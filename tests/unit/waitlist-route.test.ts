import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/email", () => ({ resend: () => null }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));

const { captureException } = await import("@/lib/observability");
const { POST } = await import("@/app/api/waitlist/route");
const { WAITLIST_MEMBERS_KEY, WAITLIST_TAG } = await import("@/lib/waitlist");

let ip = 0;
const join = (body: Record<string, string>) =>
  POST(new Request("http://localhost/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${++ip}` }, body: JSON.stringify(body) }));

let mem: MemoryStore;

beforeEach(() => {
  mem = new MemoryStore();
  kv.store = mem;
});

describe("POST /api/waitlist", () => {
  it("records no plan when the form sends none (the Ship Loop page shows no plans)", async () => {
    expect((await join({ email: "noplan@launchloop.dev", source: "ship_loop_page" })).status).toBe(200);
    const record = await mem.get<Record<string, string>>("contact:waitlist:noplan@launchloop.dev");
    expect(record).toMatchObject({ tag: WAITLIST_TAG, signup_source: "ship_loop_page" });
    expect(record).not.toHaveProperty("plan");
  });

  it("stores the signup durably with email, timestamp, shiploop_waitlist tag and source, and adds it to the launch list", async () => {
    const res = await join({ email: "Maker@Launchloop.dev", plan: "yearly", source: "kit_upsell" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, duplicate: false });

    const record = await mem.get<Record<string, string>>("contact:waitlist:maker@launchloop.dev");
    expect(record).toMatchObject({ email: "maker@launchloop.dev", source: "waitlist", tag: WAITLIST_TAG, signup_source: "kit_upsell", plan: "yearly" });
    expect(Number.isNaN(Date.parse(record!.createdAt))).toBe(false);
    expect(await mem.sMembers(WAITLIST_MEMBERS_KEY)).toEqual(["maker@launchloop.dev"]);
  });

  it("a repeat signup is a duplicate: one list entry, the first timestamp kept", async () => {
    await join({ email: "maker@launchloop.dev", plan: "monthly", source: "ship_loop_page" });
    const first = await mem.get<{ createdAt: string }>("contact:waitlist:maker@launchloop.dev");

    const res = await join({ email: "MAKER@launchloop.dev", plan: "yearly", source: "ship_loop_page" });
    expect(await res.json()).toEqual({ ok: true, duplicate: true });
    expect(await mem.get("contact:waitlist:maker@launchloop.dev")).toMatchObject({ createdAt: first!.createdAt, plan: "yearly", tag: WAITLIST_TAG });
    expect(await mem.sMembers(WAITLIST_MEMBERS_KEY)).toEqual(["maker@launchloop.dev"]);
  });

  it("an unknown source is stored as the Ship Loop page", async () => {
    await join({ email: "maker@launchloop.dev", source: "elsewhere" });
    expect(await mem.get("contact:waitlist:maker@launchloop.dev")).toMatchObject({ signup_source: "ship_loop_page" });
  });

  it("if the store is down the signup fails loudly (500, reported) instead of pretending it was saved", async () => {
    mem.failing = true;
    const res = await join({ email: "maker@launchloop.dev" });
    expect(res.status).toBe(500);
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), { stage: "api.waitlist" });
  });

  it("an invalid email is rejected and nothing is stored", async () => {
    expect((await join({ email: "not-an-email" })).status).toBe(400);
    expect(mem.keys()).toEqual([]);
  });
});
