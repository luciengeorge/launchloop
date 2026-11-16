import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DirectoryCsvError, parseDirectories } from "@/lib/directory-csv";

const m = vi.hoisted(() => ({
  env: { directoryPackBlobUrl: undefined as string | undefined },
  get: vi.fn<(url: string, options: { access: string }) => Promise<{ statusCode: 200; stream: ReadableStream<Uint8Array> } | null>>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("@/lib/env", () => ({ env: m.env, forceMock: false, isStripeMock: () => true, isEmailMock: () => true, deploymentUrl: () => "http://x", siteUrl: () => "http://x" }));
vi.mock("@vercel/blob", () => ({ get: m.get }));
vi.mock("@/lib/store", async () => {
  const { MemoryStore } = await import("./memory-store");
  const memory = new MemoryStore();
  return { store: () => memory, storeKind: () => "memory" };
});

const { allDirectories, directoryCount, freeDirectories } = await import("@/lib/directories");
const { GET: downloadCsv } = await import("@/app/api/directory-pack/[id]/csv/route");
const { recordPackPayment } = await import("@/lib/directory-pack");

const LOCAL = readFileSync(path.join(process.cwd(), "data/directory-pack/directories.csv"), "utf8");
const LOCAL_ROWS = parseDirectories(LOCAL);
const PRIVATE_ROW = '21,Private Directory,https://private-directory.example/,,launchpad,free,0,no,no,unknown,40,,,,"Private note only buyers see. checked 2026-11-16 (home 200)",privatedirectory';
const REMOTE = `${LOCAL.trimEnd()}\r\n${PRIVATE_ROW}\r\n`;
const BLOB_URL = "https://abc123.private.blob.vercel-storage.com/directory-pack/directories.csv";
const PACK_ID = "packBlobUnitTest012345";

const stream = (text: string) => new Response(text).body!;
const csvFor = (id: string) => downloadCsv(new Request(`http://x/api/directory-pack/${id}/csv`), { params: Promise.resolve({ id }) });

beforeEach(() => {
  m.env.directoryPackBlobUrl = undefined;
  m.get.mockReset();
});

describe("DIRECTORY_PACK_BLOB_URL unset", () => {
  it("is today's behaviour: the committed rows only, and the blob is never fetched", async () => {
    expect(await allDirectories()).toEqual(LOCAL_ROWS);
    expect(await directoryCount()).toBe(LOCAL_ROWS.length);
    expect(m.get).not.toHaveBeenCalled();
  });
});

describe("DIRECTORY_PACK_BLOB_URL set", () => {
  beforeEach(() => {
    m.env.directoryPackBlobUrl = BLOB_URL;
  });

  it("loads the full database from the private blob, through the schema", async () => {
    m.get.mockImplementation(async () => ({ statusCode: 200, stream: stream(REMOTE) }));
    const rows = await allDirectories();
    expect(rows).toEqual(parseDirectories(REMOTE));
    expect(await directoryCount()).toBe(LOCAL_ROWS.length + 1);
    expect(m.get).toHaveBeenCalledWith(BLOB_URL, expect.objectContaining({ access: "private" }));
  });

  it("the free page still reads only the committed top 20, never the blob", () => {
    expect(freeDirectories().map((r) => r.name)).toEqual(LOCAL_ROWS.slice(0, 20).map((r) => r.name));
    expect(m.get).not.toHaveBeenCalled();
  });

  it("serves the private rows only to a paid pack: an unpaid id gets 403 without the blob being read", async () => {
    m.get.mockImplementation(async () => ({ statusCode: 200, stream: stream(REMOTE) }));
    const unpaid = await csvFor("packNobodyPaid01234567");
    expect(unpaid.status).toBe(403);
    expect(await unpaid.text()).not.toContain("Private note only buyers see");
    expect(m.get).not.toHaveBeenCalled();

    await recordPackPayment({ product: "directoryPack", packId: PACK_ID, ref: "cs_test_blob" });
    const paid = await csvFor(PACK_ID);
    expect(paid.status).toBe(200);
    expect(parseDirectories(await paid.text())).toEqual(parseDirectories(REMOTE));
  });

  it.each([
    ["a malformed remote CSV", async () => ({ statusCode: 200 as const, stream: stream(REMOTE.replace(",launchpad,free,", ",launchpad,cheap,")) }), DirectoryCsvError],
    ["a missing blob", async () => null, /not readable/],
    ["a failed fetch", async () => Promise.reject(new Error("BlobServiceNotAvailable")), /BlobServiceNotAvailable/],
  ])("%s errors the paid request and never falls back to the committed rows", async (_label, answer, error) => {
    m.get.mockImplementation(answer);
    await expect(allDirectories()).rejects.toThrow(error);
    await recordPackPayment({ product: "directoryPack", packId: PACK_ID, ref: "cs_test_blob" });
    await expect(csvFor(PACK_ID)).rejects.toThrow(error);
  });
});
