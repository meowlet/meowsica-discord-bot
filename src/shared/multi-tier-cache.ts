import type { RedisClient } from "../infra/redis.ts";

export interface MultiTierCacheDeps {
  readonly redis: RedisClient | null;
  readonly keyPrefix: string;
  readonly memoryTtlMs: number;
  readonly memoryMaxEntries: number;
  readonly redisTtlSeconds: number;
}

interface MemoryEntry<T> {
  value: T | null;
  expiresAt: number;
}

interface NegativeMarker {
  readonly __none: true;
}

const NEGATIVE_MARKER: NegativeMarker = { __none: true };

export class MultiTierCache<T> {
  private readonly redis: RedisClient | null;
  private readonly keyPrefix: string;
  private readonly memoryTtlMs: number;
  private readonly memoryMaxEntries: number;
  private readonly redisTtlSeconds: number;
  private readonly memory = new Map<string, MemoryEntry<T>>();

  constructor(deps: MultiTierCacheDeps) {
    this.redis = deps.redis;
    this.keyPrefix = deps.keyPrefix;
    this.memoryTtlMs = deps.memoryTtlMs;
    this.memoryMaxEntries = deps.memoryMaxEntries;
    this.redisTtlSeconds = deps.redisTtlSeconds;
  }

  async get(key: string): Promise<T | null | undefined> {
    const fromMemory = this.readMemory(key);
    if (fromMemory !== undefined) return fromMemory;
    const fromRedis = await this.readRedis(key);
    if (fromRedis !== undefined) {
      this.writeMemory(key, fromRedis);
      return fromRedis;
    }
    return undefined;
  }

  async set(key: string, value: T | null): Promise<void> {
    this.writeMemory(key, value);
    await this.writeRedis(key, value);
  }

  async invalidate(key: string): Promise<void> {
    this.memory.delete(key);
    await this.deleteRedis(key);
  }

  invalidateMemory(key: string): void {
    this.memory.delete(key);
  }

  clearMemory(): void {
    this.memory.clear();
  }

  private readMemory(key: string): T | null | undefined {
    const entry = this.memory.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private writeMemory(key: string, value: T | null): void {
    if (this.memory.size >= this.memoryMaxEntries) {
      const oldestKey = this.memory.keys().next().value;
      if (oldestKey !== undefined) this.memory.delete(oldestKey);
