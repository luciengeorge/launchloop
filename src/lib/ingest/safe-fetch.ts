import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { env } from "../env";
import { KIT_ERRORS, type KitErrorCode } from "../errors";

export const USER_AGENT = "LaunchLoopBot/1.0 (+https://launchloop.dev/faq)";

export class IngestError extends Error {
  public readonly userMessage: string;
  constructor(
    message: string,
    public readonly code: KitErrorCode,
    userMessage?: string,
  ) {
    super(message);
    this.userMessage = userMessage ?? KIT_ERRORS[code].title;
    this.name = "IngestError";
  }
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
  return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new IngestError(`Blocked protocol ${url.protocol}`, "invalid_url", "Only http and https links are supported.");
  }
  if (env.ingestAllowPrivate) return;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new IngestError(`Blocked host ${host}`, "site_blocked");
  }
  let addresses: string[];
  try {
    addresses = net.isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  } catch (error) {
    throw new IngestError(`DNS lookup failed for ${host}: ${(error as Error).message}`, "site_unreachable");
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new IngestError(`Blocked private address for ${host}`, "site_blocked");
  }
}

interface SafeFetchOptions {
  accept?: string;
  headers?: Record<string, string>;
  maxBytes?: number;
  timeoutMs?: number;
}

export interface SafeFetchResult {
  url: string;
  status: number;
  contentType: string;
  text: string;
}

export interface SafeFetchBytesResult {
  url: string;
  status: number;
  contentType: string;
  bytes: Uint8Array;
  /** From the Content-Length header, when the server sent one. */
  contentLength?: number;
  /** The body was longer than maxBytes and was cut off. */
  truncated: boolean;
}

/** Fetches a public URL with SSRF checks on every redirect hop, a timeout and a size cap. */
export async function safeFetch(input: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const { url, status, contentType, bytes } = await safeFetchBytes(input, options);
  return { url, status, contentType, text: new TextDecoder().decode(bytes) };
}

/** Same guards as safeFetch, but returns the raw (capped) body, for binary files like images. */
export async function safeFetchBytes(input: string, options: SafeFetchOptions = {}): Promise<SafeFetchBytesResult> {
  const { maxBytes = 1_500_000, timeoutMs = Number(process.env.SITE_FETCH_TIMEOUT_MS ?? 8000) } = options;
  let current = new URL(input);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicUrl(current);
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": USER_AGENT, Accept: options.accept ?? "text/html,*/*;q=0.8", ...options.headers },
        cache: "no-store",
      });
    } catch (error) {
      const name = (error as Error).name;
      if (name === "TimeoutError" || name === "AbortError") throw new IngestError(`Timed out fetching ${current}`, "site_timeout");
      throw new IngestError(`Fetch failed for ${current}: ${(error as Error).message}`, "site_unreachable");
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current);
      continue;
    }
    let body: { bytes: Uint8Array; truncated: boolean };
    try {
      body = await readCapped(res, maxBytes);
    } catch (error) {
      const name = (error as Error).name;
      throw new IngestError(`Reading ${current} failed: ${(error as Error).message}`, name === "TimeoutError" || name === "AbortError" ? "site_timeout" : "site_unreachable");
    }
    const length = Number(res.headers.get("content-length"));
    return {
      url: current.toString(),
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      ...body,
      contentLength: Number.isFinite(length) && length > 0 ? length : undefined,
    };
  }
  throw new IngestError("Too many redirects", "site_http_error", "That URL redirects too many times.");
}

async function readCapped(res: Response, maxBytes: number): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!res.body) return { bytes: new Uint8Array(), truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      chunks.push(value.slice(0, value.byteLength - (total - maxBytes)));
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return { bytes: Buffer.concat(chunks), truncated };
}
