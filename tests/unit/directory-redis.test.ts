import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DirectoryCsvError, parseDirectories } from "@/lib/directory-csv";
import { MemoryStore } from "./memory-store";

const m = vi.hoisted(() => ({ store: undefined as unknown, warn: vi.fn(), sentry: vi.fn(), localFallback: false }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/store", () => ({ store: () => m.store, storeKind: () => "memory" }));
vi.mock("@/lib/observability", async (importOriginal) => ({ ...(await importOriginal<object>()), captureMessage: m.warn, captureException: vi.fn(), captureExceptionThrottled: m.sentry }));
vi.mock("@/lib/env", async (importOriginal) => {
  const real = await importOriginal<{ env: Record<string, unknown> }>();
  return { ...real, env: new Proxy(real.env, { get: (target, key) => (key === "directoryPackLocalFallback" ? m.localFallback : Reflect.get(target, key)) }) };
});
vi.mock("@/lib/email", async (importOriginal) => ({ ...(await importOriginal<object>()), sendEmail: vi.fn(async () => ({ id: "mock", mock: true })) }));

const { DIRECTORY_INDEX_KEY, directoryRowKey, seedDirectoryPack, seedWriteProblem } = await import("@/lib/directory-redis");
const { DirectoryPackUnavailableError, allDirectories, freeDirectories, redisDirectoryCount } = await import("@/lib/directories");
const { GET: downloadCsv } = await import("@/app/api/directory-pack/[id]/csv/route");
const { POST: writeListings } = await import("@/app/api/directory-pack/[id]/listings/route");
const { recordPackPayment } = await import("@/lib/directory-pack");
const { PackView } = await import("@/components/directory-pack/pack-view");

const COMMITTED = parseDirectories(readFileSync(path.join(process.cwd(), "data/directory-pack/directories.csv"), "utf8"));
const FIXTURE_CSV = readFileSync(path.join(process.cwd(), "tests/fixtures/directory-pack/directories.csv"), "utf8");
const FIXTURE = parseDirectories(FIXTURE_CSV);
const HIDDEN = FIXTURE.slice(20);

let mem: MemoryStore;
beforeEach(() => {
  mem = new MemoryStore();
  m.store = mem;
  m.warn.mockReset();
  m.sentry.mockReset();
  m.localFallback = false;
});

const PACK_ID = "packRedisUnitTest01234";
const csvFor = (id: string) => downloadCsv(new Request(`http://x/api/directory-pack/${id}/csv`), { params: Promise.resolve({ id }) });
const listingsFor = (id: string) =>
  writeListings(
    new Request(`http://x/api/directory-pack/${id}/listings`, { method: "POST", body: JSON.stringify({ name: "Snapshelf", url: "https://snapshelf.app/", oneLiner: "Find any screenshot by the words in it" }) }),
    { params: Promise.resolve({ id }) },
  );

const log = () => {
  const lines: string[] = [];
  return { lines, print: (line: string) => void lines.push(line) };
};

describe("seedDirectoryPack", () => {
  it("is a dry run by default: validates, prints counts only, and writes nothing", async () => {
    const out = log();
    expect(await seedDirectoryPack(FIXTURE_CSV, { write: false, store: () => mem, print: out.print })).toEqual({ rows: FIXTURE.length, written: 0, deleted: 0 });
    expect(mem.keys()).toEqual([]);
    expect(out.lines.join("\n")).toContain(`${FIXTURE.length} rows valid`);
    for (const row of FIXTURE) expect(out.lines.join("\n")).not.toContain(row.name);
  });

  it("--write: one hash per directory plus a rank index, under dirpack:v1:", async () => {
    const out = log();
    expect(await seedDirectoryPack(FIXTURE_CSV, { write: true, store: () => mem, print: out.print })).toEqual({ rows: FIXTURE.length, written: FIXTURE.length, deleted: 0 });
    expect(DIRECTORY_INDEX_KEY).toBe("dirpack:v1:index");
    expect(mem.keys().sort()).toEqual([DIRECTORY_INDEX_KEY, ...FIXTURE.map((r) => directoryRowKey(r.rank))].sort());
    expect(await mem.zRange(DIRECTORY_INDEX_KEY)).toEqual(FIXTURE.map((r) => String(r.rank)));
    expect(await mem.hGetAllMany([directoryRowKey(1)])).toEqual([expect.objectContaining({ rank: "1", name: FIXTURE[0].name, utm_source: FIXTURE[0].utm_source })]);
    for (const row of FIXTURE) expect(out.lines.join("\n")).not.toContain(row.name);
  });

  it("is idempotent, and a shorter file removes the rows it no longer has", async () => {
    await seedDirectoryPack(FIXTURE_CSV, { write: true, store: () => mem, print: () => {} });
    await seedDirectoryPack(FIXTURE_CSV, { write: true, store: () => mem, print: () => {} });
    expect(mem.keys()).toHaveLength(FIXTURE.length + 1);
    const top20 = readFileSync(path.join(process.cwd(), "data/directory-pack/directories.csv"), "utf8");
    expect(await seedDirectoryPack(top20, { write: true, store: () => mem, print: () => {} })).toEqual({ rows: 20, written: 20, deleted: FIXTURE.length });
    expect(mem.keys()).toHaveLength(21);
  });

  it("deletes every row key it is about to write, so a stray key can't leak into an HSET", async () => {
    await mem.transaction([{ op: "hset", key: directoryRowKey(1), fields: { stray_field: "left over" } }]);
    await seedDirectoryPack(FIXTURE_CSV, { write: true, store: () => mem, print: () => {} });
    const [first] = await mem.hGetAllMany([directoryRowKey(1)]);
    expect(first).not.toHaveProperty("stray_field");
    expect(await allDirectories()).toEqual(FIXTURE);
  });

  it("refuses a malformed CSV before touching the store", async () => {
    const bad = FIXTURE_CSV.replace(",launchpad,freemium,", ",launchpad,cheap,");
    await expect(seedDirectoryPack(bad, { write: true, store: () => mem, print: () => {} })).rejects.toThrow(DirectoryCsvError);
    expect(mem.keys()).toEqual([]);
  });
});

describe("reading the pack", () => {
  it("serves every seeded row from Redis, through the schema", async () => {
    await seedDirectoryPack(FIXTURE_CSV, { write: true, store: () => mem, print: () => {} });
    expect(await allDirectories()).toEqual(FIXTURE);
    expect(await redisDirectoryCount()).toBe(FIXTURE.length);
    expect(m.warn).not.toHaveBeenCalled();
  });

  it("local dev and e2e only: an empty index falls back to the committed top 20, flagged in the logs", async () => {
    m.localFallback = true;
    expect(await allDirectories()).toEqual(COMMITTED);
    expect(m.warn).toHaveBeenCalledWith(expect.stringContaining("committed top 20"), expect.objectContaining({ reason: "index_empty" }));
    expect(await redisDirectoryCount()).toBeNull();
  });

  it("local dev and e2e only: unreachable Redis falls back to the committed top 20, flagged in the logs, and the count is unknown", async () => {
    m.localFallback = true;
    mem.failing = true;
    expect(await allDirectories()).toEqual(COMMITTED);
    expect(m.warn).toHaveBeenCalledWith(expect.stringContaining("committed top 20"), expect.objectContaining({ reason: "redis_unreachable" }));
    expect(await redisDirectoryCount()).toBeNull();
  });

  it.each([
    ["an empty index", "index_empty"],
    ["unreachable Redis", "redis_unreachable"],
  ])("anywhere else, %s fails closed: no rows, and a throttled report to Sentry", async (_label, reason) => {
    if (reason === "redis_unreachable") mem.failing = true;
    await expect(allDirectories()).rejects.toBeInstanceOf(DirectoryPackUnavailableError);
    expect(m.sentry).toHaveBeenCalledWith(`directoryPack.unavailable:${reason}`, expect.any(Error), expect.objectContaining({ reason }));
    expect(m.warn).not.toHaveBeenCalled();
  });

  it("fails closed for a paid buyer: the page says temporarily unavailable with no rows, and the CSV and listings APIs answer 503 with Retry-After", async () => {
    await recordPackPayment({ product: "directoryPack", packId: PACK_ID, ref: "cs_test_redis" });
    const html = renderToStaticMarkup(await PackView({ id: PACK_ID }));
    expect(html).toContain("temporarily unavailable");
    expect(html).toContain('data-testid="pack-unavailable"');
    for (const row of COMMITTED) expect(html).not.toContain(row.name);

    for (const res of [await csvFor(PACK_ID), await listingsFor(PACK_ID)]) {
      expect(res.status).toBe(503);
      expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
      expect(await res.json()).toMatchObject({ code: "pack_unavailable" });
    }
    // The listings check runs before the rate limit, so an outage doesn't use up the buyer's daily runs.
    expect(mem.keys().filter((key) => key.startsWith("rl:"))).toEqual([]);
  });

  it("a malformed row in Redis errors the request instead of serving it", async () => {
    await seedDirectoryPack(FIXTURE_CSV, { write: true, store: () => mem, print: () => {} });
    await mem.transaction([{ op: "hset", key: directoryRowKey(21), fields: { pricing: "cheap" } }]);
    await expect(allDirectories()).rejects.toThrow(DirectoryCsvError);
  });

  it("the free page reads the committed top 20 and never touches Redis", async () => {
    await seedDirectoryPack(FIXTURE_CSV, { write: true, store: () => mem, print: () => {} });
    const zRange = vi.spyOn(mem, "zRange");
    const hGetAllMany = vi.spyOn(mem, "hGetAllMany");
    expect(freeDirectories().map((r) => r.name)).toEqual(COMMITTED.map((r) => r.name));
    expect(zRange).not.toHaveBeenCalled();
    expect(hGetAllMany).not.toHaveBeenCalled();
  });

  it("an unpaid id gets 403 from the CSV API without the directory rows being read", async () => {
    await seedDirectoryPack(FIXTURE_CSV, { write: true, store: () => mem, print: () => {} });
    const zRange = vi.spyOn(mem, "zRange");
    const res = await downloadCsv(new Request("http://x/api/directory-pack/packNobodyPaid01234567/csv"), { params: Promise.resolve({ id: "packNobodyPaid01234567" }) });
    expect(res.status).toBe(403);
    const body = await res.text();
    for (const row of HIDDEN) expect(body).not.toContain(row.name);
    expect(zRange).not.toHaveBeenCalled();
  });
});

describe("seedWriteProblem", () => {
  const repoRoot = process.cwd();
  const outside = "/cursor/stores/bot/launchloop-directory-pack/directories.csv";

  it("allows a write that names the detected environment, from a file outside the repo", () => {
    expect(seedWriteProblem({ target: "production", detected: "production", file: outside, repoRoot })).toBeNull();
  });

  it.each([
    ["no --env", { target: undefined, detected: "production", file: outside }, /--env production\|preview\|development/],
    ["an unknown --env", { target: "prod", detected: "production", file: outside }, /--env production\|preview\|development/],
    ["an --env that isn't the detected one", { target: "production", detected: "development", file: outside }, /doesn't match this environment \(development/],
    ["a file inside the repo", { target: "development", detected: "development", file: "tests/fixtures/directory-pack/directories.csv" }, /inside the repo/],
    ["a repo file given by absolute path", { target: "development", detected: "development", file: path.join(process.cwd(), "data/directory-pack/directories.csv") }, /inside the repo/],
  ])("refuses %s", (_label, args, problem) => {
    expect(seedWriteProblem({ ...args, repoRoot })).toMatch(problem);
  });
});
