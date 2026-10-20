import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));

const { latestUnpaidKitId } = await import("@/lib/kits");

const NOW = Date.parse("2026-10-20T10:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();
let mem: MemoryStore;

const saveKit = (id: string, createdAt: string, paid = false) => mem.set(`kit:${id}`, { id, createdAt, paid });

beforeEach(() => {
  mem = new MemoryStore();
  kv.store = mem;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

describe("latestUnpaidKitId (the rate-limit box's 'Unlock my kit')", () => {
  it("picks the newest unpaid preview from the anonymous-kits cookie", async () => {
    await saveKit("kit_a_00000000000000", hoursAgo(3));
    await saveKit("kit_b_00000000000000", hoursAgo(1));
    expect(await latestUnpaidKitId(["kit_a_00000000000000", "kit_b_00000000000000"])).toBe("kit_b_00000000000000");
  });

  it("skips paid kits, kits that no longer exist and previews older than a day", async () => {
    await saveKit("kit_old_000000000000", hoursAgo(30));
    await saveKit("kit_unpaid_000000000", hoursAgo(5));
    await saveKit("kit_paid_00000000000", hoursAgo(1), true);
    expect(await latestUnpaidKitId(["kit_old_000000000000", "kit_unpaid_000000000", "kit_paid_00000000000", "kit_gone_00000000000"])).toBe("kit_unpaid_000000000");
    expect(await latestUnpaidKitId(["kit_old_000000000000", "kit_paid_00000000000"])).toBeNull();
    expect(await latestUnpaidKitId([])).toBeNull();
  });

  it("signed in, also looks at the account's kits (the cookie isn't set for them)", async () => {
    await saveKit("kit_anon_00000000000", hoursAgo(4));
    await saveKit("kit_owned_0000000000", hoursAgo(2));
    await mem.sAdd("user:me@example.com:kits", "kit_owned_0000000000");
    expect(await latestUnpaidKitId(["kit_anon_00000000000"], "Me@Example.com")).toBe("kit_owned_0000000000");
    expect(await latestUnpaidKitId(["kit_anon_00000000000"])).toBe("kit_anon_00000000000");
  });
});
