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
