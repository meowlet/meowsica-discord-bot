import type { Db } from "../../infra/db.ts";
import type { RedisClient } from "../../infra/redis.ts";
import { MultiTierCache } from "../../shared/multi-tier-cache.ts";
import {
  GuildSettingsDbAdapter,
  type GuildSettings,
  type GuildSettingsFields,
} from "./internal/guild-settings-db.ts";

export type { GuildSettings } from "./internal/guild-settings-db.ts";

export interface GuildSettingsRepoDeps {
  readonly db: Db;
  readonly redis: RedisClient | null;
  readonly memoryTtlMs?: number;
  readonly memoryMaxEntries?: number;
}

const CACHE_PREFIX = "guild:settings:";
const CACHE_TTL_SECONDS = 60 * 60;
const DEFAULT_MEMORY_TTL_MS = 30_000;
const DEFAULT_MEMORY_MAX_ENTRIES = 5_000;

export class GuildSettingsRepository {
  private readonly db: GuildSettingsDbAdapter;
  private readonly cache: MultiTierCache<GuildSettings>;

  constructor(deps: GuildSettingsRepoDeps) {
    this.db = new GuildSettingsDbAdapter(deps.db);
    this.cache = new MultiTierCache<GuildSettings>({
      redis: deps.redis,
      keyPrefix: CACHE_PREFIX,
      memoryTtlMs: deps.memoryTtlMs ?? DEFAULT_MEMORY_TTL_MS,
      memoryMaxEntries: deps.memoryMaxEntries ?? DEFAULT_MEMORY_MAX_ENTRIES,
      redisTtlSeconds: CACHE_TTL_SECONDS,
    });
  }

  async get(guildId: string): Promise<GuildSettings | null> {
    const cached = await this.cache.get(guildId);
    if (cached !== undefined) return cached;
    const value = await this.db.findById(guildId);
    await this.cache.set(guildId, value);
    return value;
  }

  async getOrDefault(guildId: string): Promise<GuildSettings> {
    const existing = await this.get(guildId);
    if (existing) return existing;
    return { guildId, uiLocale: null, ttsLanguage: null };
  }

  async setUiLocale(guildId: string, locale: string | null): Promise<void> {
    await this.upsert(guildId, { uiLocale: locale });
  }

  async setTtsLanguage(
    guildId: string,
    language: string | null,
  ): Promise<void> {
    await this.upsert(guildId, { ttsLanguage: language });
  }

  async delete(guildId: string): Promise<void> {
    await this.db.deleteById(guildId);
    await this.cache.invalidate(guildId);
  }

  invalidate(guildId: string): void {
    void this.cache.invalidate(guildId);
  }

  private async upsert(
    guildId: string,
    fields: GuildSettingsFields,
  ): Promise<void> {
    await this.db.upsert(guildId, fields);
    await this.cache.invalidate(guildId);
  }
}
