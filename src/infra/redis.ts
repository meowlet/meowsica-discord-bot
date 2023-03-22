import { RedisClient as BunRedisClient } from "bun";
import type { Logger } from "../shared/logger.ts";

export interface RedisClientDeps {
  readonly url: string;
  readonly logger: Logger;
}

export class RedisClient {
  private readonly url: string;
  private readonly logger: Logger;
  private client: BunRedisClient | null = null;
  private connected = false;

  constructor(deps: RedisClientDeps) {
    this.url = deps.url;
    this.logger = deps.logger.withTag("REDIS");
  }

  async connect(): Promise<void> {
    if (this.client) return;
    this.client = new BunRedisClient(this.url, {
      autoReconnect: true,
      maxRetries: 5,
      enableOfflineQueue: true,
      connectionTimeout: 5_000,
    });
    this.connected = true;
    this.logger.info("Redis client ready (lazy connect)");
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  disconnect(): void {
    if (!this.client) return;
    try {
      this.client.close();
    } catch (err) {
      this.logger.warn("Error closing Redis", err);
    }
    this.client = null;
    this.connected = false;
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
