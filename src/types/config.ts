/**
 * Bot Configuration Types
 *
 * Defines all configuration options for the bot, including
 * optional sharding and Redis settings.
 */

export interface BotConfig {
  /** Discord bot token */
  readonly token: string;
  /** Bot client ID for command deployment */
  readonly clientId: string;
  /** Enable sharding mode */
  readonly enableSharding: boolean;
  /** Number of shards to spawn (auto if not specified) */
  readonly shardCount: number | "auto";
  /** Enable Redis connection */
  readonly enableRedis: boolean;
  /** Redis connection URL */
  readonly redisUrl: string | null;
  /** Voice channel timeout in minutes (0 = no timeout) */
  readonly voiceTimeoutMinutes: number;
  /** Enable debug logging */
  readonly debug: boolean;
  /** Testing guild ID for command deployment */
  readonly testingGuildId: string | null;
}

export interface RedisConfig {
  /** Redis connection URL */
  readonly url: string;
  /** Connection retry attempts */
  readonly maxRetries: number;
  /** Retry delay in milliseconds */
  readonly retryDelay: number;
}

export interface ShardingConfig {
  /** Number of shards */
  readonly shardCount: number | "auto";
  /** Shards per cluster */
  readonly shardsPerCluster: number;
  /** Spawn timeout in milliseconds */
  readonly spawnTimeout: number;
}

