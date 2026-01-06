import type {
  BotConfig,
  RedisConfig,
  ShardingConfig,
} from "../types/config.ts";

function getEnvString(key: string, defaultValue?: string): string {
  const value = Bun.env[key];
  if (value === undefined || value === "") {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvStringOrNull(key: string): string | null {
  const value = Bun.env[key];
  return value && value !== "" ? value : null;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = Bun.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value.toLowerCase() === "true" || value === "1";
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = Bun.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${key} must be a number, got: ${value}`,
    );
  }
  return parsed;
}

function getShardCount(
  key: string,
  defaultValue: number | "auto",
): number | "auto" {
  const value = Bun.env[key];
  if (value === undefined || value === "" || value.toLowerCase() === "auto") {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error(
      `Environment variable ${key} must be a positive number or 'auto', got: ${value}`,
    );
  }
  return parsed;
}

export function loadConfig(): BotConfig {
  const enableSharding = getEnvBoolean("ENABLE_SHARDING", false);
  const enableRedis = getEnvBoolean("ENABLE_REDIS", enableSharding);

  if (enableSharding && !enableRedis) {
    throw new Error(
      "Redis must be enabled when sharding is enabled (ENABLE_REDIS=true)",
    );
  }

  const redisUrl = getEnvStringOrNull("REDIS_URL");

  if (enableRedis && !redisUrl) {
    throw new Error("REDIS_URL is required when ENABLE_REDIS=true");
  }

  const clientId = Bun.env["DISCORD_CLIENT_ID"];
  if (!clientId || clientId === "") {
    throw new Error(
      "Missing required environment variable: CLIENT_ID or DISCORD_CLIENT_ID",
    );
  }

  return {
    token: getEnvString("DISCORD_TOKEN"),
    clientId,
    enableSharding,
    shardCount: getShardCount("SHARD_COUNT", "auto"),
    enableRedis,
    redisUrl,
    voiceTimeoutMinutes: getEnvNumber("VOICE_TIMEOUT_MINUTES", 5),
    debug: getEnvBoolean("DEBUG", false),
    testingGuildId:
      getEnvStringOrNull("TESTING_GUILD_ID") ||
      getEnvStringOrNull("DISCORD_GUILD_ID"),
  };
}

export function getRedisConfig(): RedisConfig {
  const url = getEnvString("REDIS_URL");
  return {
    url,
    maxRetries: getEnvNumber("REDIS_MAX_RETRIES", 10),
    retryDelay: getEnvNumber("REDIS_RETRY_DELAY", 3000),
  };
}

export function getShardingConfig(): ShardingConfig {
  return {
    shardCount: getShardCount("SHARD_COUNT", "auto"),
    shardsPerCluster: getEnvNumber("SHARDS_PER_CLUSTER", 1),
    spawnTimeout: getEnvNumber("SHARD_SPAWN_TIMEOUT", 30000),
  };
}

let cachedConfig: BotConfig | null = null;

export function getConfig(): BotConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

export { type BotConfig, type RedisConfig, type ShardingConfig };
