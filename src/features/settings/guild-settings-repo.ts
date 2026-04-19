import { eq, sql } from "drizzle-orm";
import type { Db } from "../../infra/db.ts";
import type { RedisClient } from "../../infra/redis.ts";
import { guildSettings, type GuildSettingsRow } from "./schema.ts";

export interface GuildSettings {
  readonly guildId: string;
  readonly uiLocale: string | null;
  readonly ttsLanguage: string | null;
}

export interface GuildSettingsRepoDeps {
  readonly db: Db;
  readonly redis: RedisClient;
}

const CACHE_PREFIX = "guild:settings:";
const CACHE_TTL_SECONDS = 60 * 60;

export class GuildSettingsRepository {
  private readonly db: Db;
  private readonly redis: RedisClient;

  constructor(deps: GuildSettingsRepoDeps) {
    this.db = deps.db;
    this.redis = deps.redis;
  }

  async get(guildId: string): Promise<GuildSettings | null> {
    const cached = await this.readCache(guildId);
    if (cached) return cached;
    const rows = await this.db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId))
      .limit(1);
    const row = rows[0];
    const value = row ? toSettings(row) : null;
    if (value) await this.writeCache(value);
    return value;
  }

  async getOrDefault(guildId: string): Promise<GuildSettings> {
    const existing = await this.get(guildId);
    if (existing) return existing;
    return { guildId, uiLocale: null, ttsLanguage: null };
  }

  async setUiLocale(guildId: string, locale: string | null): Promise<void> {
    await this.upsertField(guildId, { uiLocale: locale });
  }

  async setTtsLanguage(
    guildId: string,
    language: string | null,
  ): Promise<void> {
    await this.upsertField(guildId, { ttsLanguage: language });
  }

  async delete(guildId: string): Promise<void> {
    await this.db
      .delete(guildSettings)
      .where(eq(guildSettings.guildId, guildId));
    await this.invalidate(guildId);
  }

  private async upsertField(
    guildId: string,
    fields: Partial<typeof guildSettings.$inferInsert>,
  ): Promise<void> {
    await this.db
      .insert(guildSettings)
      .values({ guildId, ...fields })
      .onConflictDoUpdate({
        target: guildSettings.guildId,
        set: { ...fields, updatedAt: sql`NOW()` },
      });
    await this.invalidate(guildId);
  }

  private async readCache(guildId: string): Promise<GuildSettings | null> {
    if (!this.redis.isConnected()) return null;
    const raw = await this.redis.getJson<GuildSettings>(
      `${CACHE_PREFIX}${guildId}`,
    );
    return raw;
  }

  private async writeCache(value: GuildSettings): Promise<void> {
    if (!this.redis.isConnected()) return;
    await this.redis.setJson(
      `${CACHE_PREFIX}${value.guildId}`,
      value,
      CACHE_TTL_SECONDS,
    );
  }

  private async invalidate(guildId: string): Promise<void> {
    await this.redis.clearGuildSettings(guildId);
  }
}

function toSettings(row: GuildSettingsRow): GuildSettings {
  return {
    guildId: row.guildId,
    uiLocale: row.uiLocale,
    ttsLanguage: row.ttsLanguage,
  };
}
