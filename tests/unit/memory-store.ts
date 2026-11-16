import type { KeyValueStore, StoreWrite } from "@/lib/store";

/** In-memory KeyValueStore with TTLs on the (fakeable) clock. `failing` makes every call reject, like Upstash being down. */
export class MemoryStore implements KeyValueStore {
  private data = new Map<string, { value: unknown; expiresAt?: number }>();
  failing = false;

  private check() {
    if (this.failing) throw new Error("KV command failed with 503");
  }

  private read(key: string) {
    const entry = this.data.get(key);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  keys(): string[] {
    return [...this.data.keys()].filter((k) => this.read(k));
  }

  async get<T>(key: string): Promise<T | null> {
    this.check();
    return (this.read(key)?.value as T) ?? null;
  }

  async exists(key: string): Promise<boolean> {
    this.check();
    return this.read(key) !== undefined;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.check();
    this.data.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
  }

  async getDel<T>(key: string): Promise<T | null> {
    const value = await this.get<T>(key);
    this.data.delete(key);
    return value;
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    this.check();
    const entry = this.read(key);
    const value = ((entry?.value as number) ?? 0) + 1;
    this.data.set(key, { value, expiresAt: entry?.expiresAt ?? Date.now() + ttlSeconds * 1000 });
    return value;
  }

  async decr(key: string, ttlSeconds: number): Promise<number> {
    this.check();
    const entry = this.read(key);
    const value = ((entry?.value as number) ?? 0) - 1;
    this.data.set(key, { value, expiresAt: value <= 0 ? Date.now() + ttlSeconds * 1000 : entry?.expiresAt });
    return value;
  }

  async sAdd(key: string, member: string): Promise<void> {
    const members = (await this.get<string[]>(key)) ?? [];
    if (!members.includes(member)) await this.set(key, [...members, member]);
  }

  async sRem(key: string, member: string): Promise<void> {
    const members = (await this.get<string[]>(key)) ?? [];
    if (members.includes(member)) await this.set(key, members.filter((m) => m !== member));
  }

  async sMembers(key: string): Promise<string[]> {
    return (await this.get<string[]>(key)) ?? [];
  }

  async zRange(key: string): Promise<string[]> {
    const entries = (await this.get<[number, string][]>(key)) ?? [];
    return [...entries].sort((a, b) => a[0] - b[0]).map(([, member]) => member);
  }

  async hGetAllMany(keys: string[]): Promise<(Record<string, string> | null)[]> {
    this.check();
    return keys.map((key) => (this.read(key)?.value as Record<string, string>) ?? null);
  }

  /** All or nothing, like MULTI/EXEC: the writes apply to a copy that replaces the data only when every one succeeded. */
  async transaction(writes: StoreWrite[]): Promise<void> {
    this.check();
    const next = new Map(this.data);
    for (const w of writes) {
      if (w.op === "del") next.delete(w.key);
      else if (w.op === "hset") next.set(w.key, { value: { ...(next.get(w.key)?.value as Record<string, string>), ...w.fields } });
      else next.set(w.key, { value: [...((next.get(w.key)?.value as [number, string][]) ?? []).filter(([, m]) => m !== w.member), [w.score, w.member]] });
    }
    this.data = next;
  }
}
