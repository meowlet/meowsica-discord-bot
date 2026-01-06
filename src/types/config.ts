export interface BotConfig {
  readonly token: string;

  readonly clientId: string;

  readonly ownerId: string | null;

  readonly enableSharding: boolean;

  readonly shardCount: number | "auto";

  readonly enableRedis: boolean;

  readonly redisUrl: string | null;

  readonly voiceTimeoutMinutes: number;

  readonly debug: boolean;

  readonly testingGuildId: string | null;

  readonly googleCloudApiKey: string | null;
}

export interface RedisConfig {
  readonly url: string;

  readonly maxRetries: number;

  readonly retryDelay: number;
}

export interface ShardingConfig {
  readonly shardCount: number | "auto";

  readonly shardsPerCluster: number;

  readonly spawnTimeout: number;
}
