import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";

/**
 * Minimal key-value store. Uses Upstash Redis / Vercel KV over REST when
 * KV_REST_API_URL + KV_REST_API_TOKEN are set, otherwise JSON files on disk.
 * Files are fine locally; on Vercel they live in /tmp and are not durable.
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
}

class FileStore implements KeyValueStore {
  constructor(private dir: string) {}

  private file(key: string) {
    return path.join(this.dir, `${key.replace(/[^a-zA-Z0-9_.-]/g, "_")}.json`);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(this.file(key), "utf8");
      const parsed = JSON.parse(raw) as { value: T; expiresAt?: number };
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) return null;
      return parsed.value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const target = this.file(key);
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    const payload = { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined };
    await fs.writeFile(tmp, JSON.stringify(payload));
    await fs.rename(tmp, target);
  }
}

class RedisRestStore implements KeyValueStore {
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async command<R>(args: (string | number)[]): Promise<R> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`KV command ${args[0]} failed with ${res.status}`);
    const body = (await res.json()) as { result: R; error?: string };
    if (body.error) throw new Error(`KV error: ${body.error}`);
    return body.result;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.command<string | null>(["GET", key]);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const args: (string | number)[] = ["SET", key, JSON.stringify(value)];
    if (ttlSeconds) args.push("EX", ttlSeconds);
    await this.command(args);
  }
}

let instance: KeyValueStore | null = null;

export function store(): KeyValueStore {
  if (instance) return instance;
  if (env.kvUrl && env.kvToken) {
    instance = new RedisRestStore(env.kvUrl, env.kvToken);
  } else {
    const dir = env.dataDir ?? (process.env.VERCEL ? "/tmp/launchloop" : path.join(process.cwd(), ".data"));
    instance = new FileStore(dir);
  }
  return instance;
}

export const storeKind = () => (env.kvUrl && env.kvToken ? "redis" : "file");
