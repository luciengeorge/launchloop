import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { Agent, fetch, type Response } from "undici";
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

const BLOCKED_ADDRESSES = new net.BlockList();
for (const [prefix, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  // Multicast, reserved and broadcast (224.0.0.0 - 255.255.255.255).
  ["224.0.0.0", 3],
] as const) {
  BLOCKED_ADDRESSES.addSubnet(prefix, bits, "ipv4");
}
// IPv4-mapped addresses (::ffff:0:0/96) are matched against the IPv4 rules above by BlockList itself.
// Ranges that embed or tunnel to an IPv4 address (compat, NAT64, 6to4, Teredo) are blocked outright.
for (const [prefix, bits] of [
  ["::", 96],
  // IPv4-translated (SIIT): ::ffff:0:a.b.c.d is not IPv4-mapped, so BlockList doesn't fold it into the IPv4 rules.
  ["::ffff:0:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  BLOCKED_ADDRESSES.addSubnet(prefix, bits, "ipv6");
}

/** True for any address that is not a plain public unicast address, including unparseable input. */
export function isPrivateIp(ip: string): boolean {
  const address = ip.replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const family = net.isIP(address);
  if (family === 0) return true;
  return BLOCKED_ADDRESSES.check(address, family === 4 ? "ipv4" : "ipv6");
}

interface ResolvedAddress {
  address: string;
  family: number;
}

type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | ResolvedAddress[], family?: number) => void;

/**
 * Answers the socket's DNS lookup with addresses that were already resolved and checked,
 * so the connection goes to exactly the IP that passed validation (no second, rebindable lookup).
 */
export function pinnedLookup(hostname: string, addresses: ResolvedAddress[]) {
  return (requested: string, options: { all?: boolean }, callback: LookupCallback) => {
    if (requested !== hostname || addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
      callback(Object.assign(new IngestError(`Blocked private address for ${requested}`, "site_blocked"), { code: "EBLOCKED" }), "");
      return;
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  };
}

/** Validates the URL and returns a dispatcher that can only connect to the validated addresses. */
async function publicDispatcher(url: URL): Promise<Agent | undefined> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new IngestError(`Blocked protocol ${url.protocol}`, "invalid_url", "Only http and https links are supported.");
  }
  if (env.ingestAllowPrivate) return undefined;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new IngestError(`Blocked host ${host}`, "site_blocked");
  }
  let addresses: ResolvedAddress[];
  try {
    addresses = net.isIP(host) ? [{ address: host, family: net.isIP(host) }] : await lookup(host, { all: true });
  } catch (error) {
    throw new IngestError(`DNS lookup failed for ${host}: ${(error as Error).message}`, "site_unreachable");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new IngestError(`Blocked private address for ${host}`, "site_blocked");
  }
  return new Agent({ connect: { lookup: pinnedLookup(host, addresses) } });
}

function ingestErrorCause(error: unknown): IngestError | undefined {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    if (cause instanceof IngestError) return cause;
  }
  return undefined;
}

interface SafeFetchOptions {
  accept?: string;
  headers?: Record<string, string>;
  /** Sent to the first URL's origin only: a redirect to another origin drops them, as browsers drop Authorization. */
  originHeaders?: Record<string, string>;
  maxBytes?: number;
  timeoutMs?: number;
  /** Aborts the fetch early, as a timeout does. */
  signal?: AbortSignal;
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
  const origin = current.origin;
  for (let hop = 0; hop < 4; hop++) {
    const dispatcher = await publicDispatcher(current);
    try {
      let res: Response;
      try {
        res = await fetch(current, {
          redirect: "manual",
          signal: options.signal ? AbortSignal.any([AbortSignal.timeout(timeoutMs), options.signal]) : AbortSignal.timeout(timeoutMs),
          headers: {
            "User-Agent": USER_AGENT,
            Accept: options.accept ?? "text/html,*/*;q=0.8",
            ...options.headers,
            ...(current.origin === origin ? options.originHeaders : undefined),
          },
          cache: "no-store",
          dispatcher,
        });
      } catch (error) {
        const blocked = ingestErrorCause(error);
        if (blocked) throw blocked;
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
    } finally {
      void dispatcher?.destroy().catch(() => {});
    }
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
