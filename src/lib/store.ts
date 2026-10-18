import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { keyPrefix } from "./deploy-env";
import { env } from "./env";

/**
 * Minimal key-value store. Uses Upstash Redis / Vercel KV over REST when
 * KV_REST_API_URL + KV_REST_API_TOKEN are set, otherwise JSON files on disk.
 * Files are fine locally; on Vercel they live in /tmp and are not durable.
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** Atomically reads and deletes a key (used for single-use tokens). */
  getDel<T>(key: string): Promise<T | null>;
  /** Increments a counter, setting its TTL when it is first created. Returns the new value. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  sAdd(key: string, member: string): Promise<void>;
  sRem(key: string, member: string): Promise<void>;
  sMembers(key: string): Promise<string[]>;
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

  // File mode is single-process (local dev / tests), so a promise chain is enough to serialise writes.
  private queue: Promise<unknown> = Promise.resolve();
  private serial<R>(fn: () => Promise<R>): Promise<R> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }

  getDel<T>(key: string): Promise<T | null> {
    return this.serial(async () => {
      const value = await this.get<T>(key);
      await fs.rm(this.file(key), { force: true });
      return value;
    });
  }

  incr(key: string, ttlSeconds: number): Promise<number> {
    return this.serial(async () => {
      let parsed: { value: number; expiresAt?: number } | null = null;
      try {
        parsed = JSON.parse(await fs.readFile(this.file(key), "utf8"));
      } catch {
        parsed = null;
      }
      if (!parsed || (parsed.expiresAt && parsed.expiresAt < Date.now())) parsed = { value: 0, expiresAt: Date.now() + ttlSeconds * 1000 };
      const value = parsed.value + 1;
      await fs.mkdir(this.dir, { recursive: true });
      await fs.writeFile(this.file(key), JSON.stringify({ value, expiresAt: parsed.expiresAt }));
      return value;
    });
  }

  sAdd(key: string, member: string): Promise<void> {
    return this.serial(async () => {
      const members = (await this.get<string[]>(key)) ?? [];
      if (!members.includes(member)) await this.set(key, [...members, member]);
    });
  }

  sRem(key: string, member: string): Promise<void> {
    return this.serial(async () => {
      const members = (await this.get<string[]>(key)) ?? [];
      if (members.includes(member)) await this.set(key, members.filter((m) => m !== member));
    });
  }

  async sMembers(key: string): Promise<string[]> {
    return (await this.get<string[]>(key)) ?? [];
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

  async getDel<T>(key: string): Promise<T | null> {
    const raw = await this.command<string | null>(["GETDEL", key]);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const value = await this.command<number>(["INCR", key]);
    if (value === 1) await this.command(["EXPIRE", key, ttlSeconds]);
    return value;
  }

  async sAdd(key: string, member: string): Promise<void> {
    await this.command(["SADD", key, member]);
  }

  async sRem(key: string, member: string): Promise<void> {
    await this.command(["SREM", key, member]);
  }

  async sMembers(key: string): Promise<string[]> {
    return (await this.command<string[] | null>(["SMEMBERS", key])) ?? [];
  }
}

/** Namespaces every key by deployment env so previews and dev never touch production data. */
class PrefixedStore implements KeyValueStore {
  constructor(
    private inner: KeyValueStore,
    private prefix: string,
  ) {}
  private k(key: string) {
    return this.prefix + key;
  }
  get<T>(key: string) {
    return this.inner.get<T>(this.k(key));
  }
  set<T>(key: string, value: T, ttlSeconds?: number) {
    return this.inner.set(this.k(key), value, ttlSeconds);
  }
  getDel<T>(key: string) {
    return this.inner.getDel<T>(this.k(key));
  }
  incr(key: string, ttlSeconds: number) {
    return this.inner.incr(this.k(key), ttlSeconds);
  }
  sAdd(key: string, member: string) {
    return this.inner.sAdd(this.k(key), member);
  }
  sRem(key: string, member: string) {
    return this.inner.sRem(this.k(key), member);
  }
  sMembers(key: string) {
    return this.inner.sMembers(this.k(key));
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
  const prefix = keyPrefix();
  if (prefix) instance = new PrefixedStore(instance, prefix);
  return instance;
}

export const storeKind = () => (env.kvUrl && env.kvToken ? "redis" : "file");
