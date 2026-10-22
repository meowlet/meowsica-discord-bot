import { RedisClient as BunRedisClient } from "bun";
import type { Logger } from "../shared/logger.ts";

const REDIS_CONNECT_TIMEOUT_MS = 5_000;

export interface RedisClientDeps {
  readonly url: string;
  readonly logger: Logger;
}

export class RedisClient {
  private readonly url: string;
  private readonly logger: Logger;
  private client: BunRedisClient | null = null;

  constructor(deps: RedisClientDeps) {
    this.url = deps.url;
    this.logger = deps.logger.withTag("REDIS");
  }

  async connect(): Promise<void> {
    if (this.client) return;
    const client = new BunRedisClient(this.url, {
      autoReconnect: true,
      maxRetries: 5,
      enableOfflineQueue: true,
      connectionTimeout: 5_000,
    });
    const pending = client.connect();
    try {
      await withTimeout(pending, REDIS_CONNECT_TIMEOUT_MS);
    } catch (err) {
      // Avoid an unhandled rejection if the connection settles after we bail.
      pending.catch(() => {});
      try {
        client.close();
      } catch {
        // noop
      }
      throw err;
    }
    this.client = client;
    this.logger.info("Redis connected");
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  disconnect(): void {
    if (!this.client) return;
    try {
      this.client.close();
    } catch (err) {
      this.logger.warn("Error closing Redis", err);
    }
    this.client = null;
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`getJson failed for ${key}`, err);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.send("SET", [
          key,
          payload,
          "EX",
          String(Math.floor(ttlSeconds)),
        ]);
        return;
      }
      await this.client.set(key, payload);
    } catch (err) {
      this.logger.warn(`setJson failed for ${key}`, err);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`del failed for ${key}`, err);
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.send("PING", []);
      return result === "PONG" || result === "+PONG";
    } catch {
      return false;
    }
  }
}

export async function connectRedis(
  config: { enabled: boolean; url: string },
  logger: Logger,
): Promise<RedisClient | null> {
  if (!config.enabled) return null;
  const client = new RedisClient({ url: config.url, logger });
  try {
    await client.connect();
    return client;
  } catch (err) {
    logger.warn("redis connection failed; continuing without cache", err);
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`redis connect timed out after ${ms}ms`)),
          ms,
        );
        if (timer && typeof timer.unref === "function") timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
