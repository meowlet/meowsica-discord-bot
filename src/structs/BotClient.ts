/**
 * BotClient
 *
 * Extended Discord.js Client with custom properties for
 * configuration, Redis, and TTS management.
 */

import { Client, Collection, GatewayIntentBits, type ClientOptions } from "discord.js";
import type { BotConfig } from "../types/config.ts";
import { RedisService } from "../services/RedisService.ts";
import { botLogger } from "../utils/logger.ts";

interface BotClientOptions {
  config: BotConfig;
  clientOptions?: Partial<ClientOptions>;
}

export class BotClient extends Client {
  /** Bot configuration */
  public readonly config: BotConfig;

  /** Whether the bot has completed initialization */
  public initialized: boolean = false;

  /** Shard ID if running in sharded mode */
  public shardId: number | null = null;

  /** Total shard count if running in sharded mode */
  public totalShards: number | null = null;

  constructor(options: BotClientOptions) {
    const defaultIntents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ];

    // In direct mode (not sharded), we should NOT pass shardCount to Client
    // ShardingManager handles shardCount for sharded mode
    const clientOptions: ClientOptions = {
      intents: defaultIntents,
    };

    // Merge any additional client options, but exclude shardCount in direct mode
    if (options.clientOptions) {
      const { shardCount, ...restOptions } = options.clientOptions;
      // Only include shardCount if sharding is enabled (ShardingManager will set it)
      if (options.config.enableSharding && shardCount !== undefined) {
        Object.assign(clientOptions, { shardCount }, restOptions);
      } else {
        Object.assign(clientOptions, restOptions);
      }
    }

    super(clientOptions);

    this.config = options.config;

    // Set shard info from environment if available (set by ShardingManager)
    if (process.env.SHARD_ID !== undefined) {
      this.shardId = parseInt(process.env.SHARD_ID, 10);
    }
    if (process.env.SHARD_COUNT !== undefined) {
      this.totalShards = parseInt(process.env.SHARD_COUNT, 10);
    }
  }

  /**
   * Initialize bot services (Redis, etc.)
   */
  async initialize(): Promise<void> {
    botLogger.info("Initializing bot services...");

    // Initialize Redis if enabled
    if (this.config.enableRedis) {
      try {
        await RedisService.connect();
        botLogger.success("Redis connected");
      } catch (error) {
        botLogger.error("Failed to connect to Redis:", error);
        // Redis is required for sharding, throw if sharding is enabled
        if (this.config.enableSharding) {
          throw new Error("Redis connection required for sharding mode");
        }
        botLogger.warn("Continuing without Redis...");
      }
    }

    botLogger.success("Bot services initialized");
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    botLogger.info("Shutting down bot...");

    // Disconnect from Redis
    if (this.config.enableRedis && RedisService.isConnected()) {
      RedisService.disconnect();
    }

    // Destroy Discord client
    this.destroy();

    botLogger.info("Bot shutdown complete");
  }

  /**
   * Login and start the bot
   */
  async start(): Promise<void> {
    await this.initialize();

    botLogger.info("Logging in to Discord...");
    await this.login(this.config.token);
  }

  /**
   * Get shard info string for logging
   */
  getShardInfo(): string {
    if (this.shardId !== null && this.totalShards !== null) {
      return `[Shard ${this.shardId}/${this.totalShards - 1}]`;
    }
    return "[Single]";
  }

  /**
   * Check if running in sharded mode
   */
  isSharded(): boolean {
    return this.shardId !== null;
  }
}

