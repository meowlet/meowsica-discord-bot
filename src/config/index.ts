export interface PresenceConfig {
  readonly status: "online" | "idle" | "dnd" | "invisible";
  readonly activityName: string;
  readonly activityType: number;
}

export interface BotConfig {
  readonly token: string;
  readonly clientId: string;
  readonly guildId?: string;
  readonly ownerId?: string;
  readonly googleCloudApiKey?: string;
  readonly voiceTimeoutMinutes: number;
  readonly monthlyQuotaLimit: number;
  readonly presence: PresenceConfig;
  readonly nodeEnv: "development" | "production";
  readonly logLevel: "error" | "warn" | "info" | "debug";
  readonly debug: boolean;
}

export interface RedisConfig {
  readonly enabled: boolean;
  readonly url: string;
}

export interface ShardingConfig {
  readonly enabled: boolean;
  readonly shardCount: "auto" | number;
}

export interface DatabaseConfig {
  readonly url: string;
  readonly maxConnections: number;
}

export interface AppEnvConfig {
  readonly bot: BotConfig;
  readonly redis: RedisConfig;
  readonly sharding: ShardingConfig;
  readonly database: DatabaseConfig;
}

const REQUIRED_ENV_VARS = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"] as const;

function requireEnv(name: string): string {
  const value = Bun.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = Bun.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

function readInt(name: string, fallback: number): number {
  const raw = Bun.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadPresenceConfig(): PresenceConfig {
  const statusRaw = Bun.env["PRESENCE_STATUS"];
  const status: PresenceConfig["status"] =
    statusRaw === "idle" ||
    statusRaw === "dnd" ||
    statusRaw === "invisible" ||
    statusRaw === "online"
      ? statusRaw
      : "online";
  const activityName = Bun.env["PRESENCE_ACTIVITY_NAME"] || "Wavenet TTS";
  const activityType = readInt("PRESENCE_ACTIVITY_TYPE", 3);
  return { status, activityName, activityType };
}

function loadBotConfig(): BotConfig {
  for (const name of REQUIRED_ENV_VARS) requireEnv(name);
  const nodeEnvRaw = Bun.env["NODE_ENV"];
  const nodeEnv: BotConfig["nodeEnv"] =
    nodeEnvRaw === "production" ? "production" : "development";
  const logLevelRaw = Bun.env["LOG_LEVEL"];
  const logLevel: BotConfig["logLevel"] =
    logLevelRaw === "error" ||
    logLevelRaw === "warn" ||
    logLevelRaw === "info" ||
    logLevelRaw === "debug"
      ? logLevelRaw
      : nodeEnv === "production"
        ? "info"
        : "debug";
  return {
    token: requireEnv("DISCORD_TOKEN"),
    clientId: requireEnv("DISCORD_CLIENT_ID"),
    guildId: Bun.env["DISCORD_GUILD_ID"] || undefined,
    ownerId: Bun.env["OWNER_ID"] || undefined,
    googleCloudApiKey: Bun.env["GOOGLE_CLOUD_API_KEY"] || undefined,
    voiceTimeoutMinutes: readInt("VOICE_TIMEOUT_MINUTES", 5),
    monthlyQuotaLimit: readInt("MONTHLY_QUOTA_LIMIT", 100_000),
    presence: loadPresenceConfig(),
    nodeEnv,
    logLevel,
    debug: readBool("DEBUG", false),
  };
}

function loadRedisConfig(): RedisConfig {
  const enabled = readBool("ENABLE_REDIS", false);
  const url = Bun.env["REDIS_URL"] || "redis://localhost:6379";
  return { enabled, url };
}

function loadShardingConfig(): ShardingConfig {
  const enabled = readBool("ENABLE_SHARDING", false);
  const raw = Bun.env["SHARD_COUNT"];
  let shardCount: ShardingConfig["shardCount"] = "auto";
  if (raw && raw !== "auto") {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) shardCount = parsed;
  }
  return { enabled, shardCount };
}

function loadDatabaseConfig(): DatabaseConfig {
  const url = requireEnv("DATABASE_URL");
  return { url, maxConnections: readInt("DATABASE_MAX_CONNECTIONS", 10) };
}

export function loadAppEnvConfig(): AppEnvConfig {
  return {
    bot: loadBotConfig(),
    redis: loadRedisConfig(),
    sharding: loadShardingConfig(),
    database: loadDatabaseConfig(),
  };
}
