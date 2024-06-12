import { eq, sql } from "drizzle-orm";
import type { Db } from "../../../infra/db.ts";
import type { TtsProvider } from "../../tts/types.ts";
import { userPrefs, type UserPrefsRow } from "../schema.ts";

export interface UserPreferences {
  readonly userId: string;
  readonly uiLocale: string | null;
  readonly tts: {
    readonly provider: TtsProvider;
    readonly language: string | null;
    readonly voiceId: string | null;
    readonly speed: number;
    readonly pitch: number;
  };
}

export type UserPrefsFields = Partial<typeof userPrefs.$inferInsert>;

export class UserPrefsDbAdapter {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async findById(userId: string): Promise<UserPreferences | null> {
    const rows = await this.db
      .select()
      .from(userPrefs)
      .where(eq(userPrefs.userId, userId))
      .limit(1);
    const row = rows[0];
    return row ? toPreferences(row) : null;
  }

  async upsert(userId: string, fields: UserPrefsFields): Promise<void> {
    await this.db
      .insert(userPrefs)
      .values({ userId, ...fields })
      .onConflictDoUpdate({
        target: userPrefs.userId,
        set: { ...fields, updatedAt: sql`NOW()` },
      });
  }
}

function toPreferences(row: UserPrefsRow): UserPreferences {
  return {
    userId: row.userId,
    uiLocale: row.uiLocale,
    tts: {
      provider: row.ttsProvider as TtsProvider,
      language: row.ttsLanguage,
      voiceId: row.ttsVoiceId,
      speed: row.ttsSpeed,
      pitch: row.ttsPitch,
    },
  };
}
