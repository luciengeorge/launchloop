import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { env } from "../env";

export const USER_AGENT = "LaunchLoopBot/1.0 (+https://launchloop.dev/faq)";

export class IngestError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string = message,
  ) {
    super(message);
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
    throw new IngestError(`Blocked protocol ${url.protocol}`, "Only http and https URLs are supported.");
  }
  if (env.ingestAllowPrivate) return;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new IngestError(`Blocked host ${host}`, "That address isn't publicly reachable.");
  }
  const addresses = net.isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new IngestError(`Blocked private address for ${host}`, "That address isn't publicly reachable.");
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

/** Fetches a public URL with SSRF checks on every redirect hop, a timeout and a size cap. */
export async function safeFetch(input: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const { maxBytes = 1_500_000, timeoutMs = 8000 } = options;
  let current = new URL(input);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": USER_AGENT, Accept: options.accept ?? "text/html,*/*;q=0.8", ...options.headers },
      cache: "no-store",
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current);
      continue;
    }
    const text = await readCapped(res, maxBytes);
    return { url: current.toString(), status: res.status, contentType: res.headers.get("content-type") ?? "", text };
  }
  throw new IngestError("Too many redirects", "That URL redirects too many times.");
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      chunks.push(value.slice(0, value.byteLength - (total - maxBytes)));
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
