import { eq, sql } from "drizzle-orm";
import type { Db } from "../../infra/db.ts";
import type { TtsProvider, UserTtsProfile } from "../tts/types.ts";
import { DEFAULT_USER_TTS_PROFILE } from "../tts/types.ts";
import { userPrefs, type UserPrefsRow } from "./schema.ts";

export interface UserPreferences {
  readonly userId: string;
  readonly uiLocale: string | null;
  readonly tts: UserTtsProfile;
}

export interface UserPrefsRepoDeps {
  readonly db: Db;
}

export class UserPrefsRepository {
  private readonly db: Db;

  constructor(deps: UserPrefsRepoDeps) {
    this.db = deps.db;
  }

  async get(userId: string): Promise<UserPreferences | null> {
    const rows = await this.db
      .select()
      .from(userPrefs)
      .where(eq(userPrefs.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return toPreferences(row);
  }

  async getOrDefault(userId: string): Promise<UserPreferences> {
    const existing = await this.get(userId);
    if (existing) return existing;
    return {
      userId,
      uiLocale: null,
      tts: DEFAULT_USER_TTS_PROFILE,
    };
  }

  async setUiLocale(userId: string, locale: string | null): Promise<void> {
    await this.upsertField(userId, { uiLocale: locale });
  }

  async setTtsProvider(userId: string, provider: TtsProvider): Promise<void> {
    await this.upsertField(userId, { ttsProvider: provider });
  }

  async setTtsLanguage(userId: string, language: string | null): Promise<void> {
    await this.upsertField(userId, { ttsLanguage: language });
  }

  async setTtsVoice(userId: string, voiceId: string | null): Promise<void> {
    await this.upsertField(userId, { ttsVoiceId: voiceId });
  }

  async setTtsSpeed(userId: string, speed: number): Promise<void> {
    await this.upsertField(userId, { ttsSpeed: speed });
  }

  async setTtsPitch(userId: string, pitch: number): Promise<void> {
    await this.upsertField(userId, { ttsPitch: pitch });
  }

  async resetTuning(userId: string): Promise<void> {
    await this.upsertField(userId, { ttsSpeed: 1.0, ttsPitch: 0.0 });
  }

  private async upsertField(
    userId: string,
    fields: Partial<typeof userPrefs.$inferInsert>,
  ): Promise<void> {
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
