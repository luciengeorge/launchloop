import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DirectoryCsvError, parseDirectories } from "@/lib/directory-csv";
import { MemoryStore } from "./memory-store";

const m = vi.hoisted(() => ({ store: undefined as unknown, warn: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/store", () => ({ store: () => m.store, storeKind: () => "memory" }));
vi.mock("@/lib/observability", async (importOriginal) => ({ ...(await importOriginal<object>()), captureMessage: m.warn, captureException: vi.fn() }));

const { DIRECTORY_INDEX_KEY, directoryRowKey, seedDirectoryPack } = await import("@/lib/directory-redis");
const { allDirectories, freeDirectories, redisDirectoryCount } = await import("@/lib/directories");
const { GET: downloadCsv } = await import("@/app/api/directory-pack/[id]/csv/route");

const COMMITTED = parseDirectories(readFileSync(path.join(process.cwd(), "data/directory-pack/directories.csv"), "utf8"));
const FIXTURE_CSV = readFileSync(path.join(process.cwd(), "tests/fixtures/directory-pack/directories.csv"), "utf8");
const FIXTURE = parseDirectories(FIXTURE_CSV);
const HIDDEN = FIXTURE.slice(20);

let mem: MemoryStore;
beforeEach(() => {
  mem = new MemoryStore();
  m.store = mem;
  m.warn.mockReset();
});

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

  it("an empty index falls back to the committed top 20, flagged in the logs", async () => {
    expect(await allDirectories()).toEqual(COMMITTED);
    expect(m.warn).toHaveBeenCalledWith(expect.stringContaining("committed top 20"), expect.objectContaining({ reason: "index_empty" }));
    expect(await redisDirectoryCount()).toBeNull();
  });

  it("unreachable Redis falls back to the committed top 20, flagged in the logs, and the count is unknown", async () => {
    mem.failing = true;
    expect(await allDirectories()).toEqual(COMMITTED);
    expect(m.warn).toHaveBeenCalledWith(expect.stringContaining("committed top 20"), expect.objectContaining({ reason: "redis_unreachable" }));
    expect(await redisDirectoryCount()).toBeNull();
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
