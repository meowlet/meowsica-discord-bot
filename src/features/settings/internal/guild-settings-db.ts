import { eq, sql } from "drizzle-orm";
import type { Db } from "../../../infra/db.ts";
import { guildSettings, type GuildSettingsRow } from "../schema.ts";

export interface GuildSettings {
  readonly guildId: string;
  readonly uiLocale: string | null;
  readonly ttsLanguage: string | null;
}

export type GuildSettingsFields = Partial<typeof guildSettings.$inferInsert>;

export class GuildSettingsDbAdapter {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async findById(guildId: string): Promise<GuildSettings | null> {
    const rows = await this.db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId))
      .limit(1);
    const row = rows[0];
    return row ? toSettings(row) : null;
  }

  async upsert(guildId: string, fields: GuildSettingsFields): Promise<void> {
    await this.db
      .insert(guildSettings)
      .values({ guildId, ...fields })
      .onConflictDoUpdate({
        target: guildSettings.guildId,
        set: { ...fields, updatedAt: sql`NOW()` },
      });
  }

  async deleteById(guildId: string): Promise<void> {
    await this.db
      .delete(guildSettings)
      .where(eq(guildSettings.guildId, guildId));
  }
}

function toSettings(row: GuildSettingsRow): GuildSettings {
  return {
    guildId: row.guildId,
    uiLocale: row.uiLocale,
    ttsLanguage: row.ttsLanguage,
  };
}
