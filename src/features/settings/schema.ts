import { sql } from "drizzle-orm";
import {
  pgSchema,
  text,
  real,
  timestamp,
  check,
  pgEnum,
} from "drizzle-orm/pg-core";

export const appSchema = pgSchema("app");

export const ttsProviderEnum = pgEnum("tts_provider", ["basic", "wavenet"]);

export const userPrefs = appSchema.table(
  "user_preferences",
  {
    userId: text("user_id").primaryKey(),
    uiLocale: text("ui_locale"),
    ttsProvider: ttsProviderEnum("tts_provider").notNull().default("wavenet"),
    ttsLanguage: text("tts_language"),
    ttsVoiceId: text("tts_voice_id"),
    ttsSpeed: real("tts_speed").notNull().default(1.0),
    ttsPitch: real("tts_pitch").notNull().default(0.0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("user_prefs_speed_range", sql`${t.ttsSpeed} BETWEEN 0.25 AND 4.0`),
    check("user_prefs_pitch_range", sql`${t.ttsPitch} BETWEEN -20.0 AND 20.0`),
  ],
);

export const guildSettings = appSchema.table("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  uiLocale: text("ui_locale"),
  ttsLanguage: text("tts_language"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserPrefsRow = typeof userPrefs.$inferSelect;
export type UserPrefsInsert = typeof userPrefs.$inferInsert;
export type GuildSettingsRow = typeof guildSettings.$inferSelect;
export type GuildSettingsInsert = typeof guildSettings.$inferInsert;
