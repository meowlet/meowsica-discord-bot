import { Database } from "bun:sqlite";
import type { ChatInputCommandInteraction } from "discord.js";
import { DEFAULT_LOCALE, type Locale } from "../i18n/index.ts";
import type { TTSProviderType, UserVoicePreferences } from "../types/google-tts.ts";

const db = new Database("settings.db");

db.run(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    locale_language TEXT,
    voice_language TEXT,
    is_premium INTEGER DEFAULT 0,
    premium_until INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS server_settings (
    server_id TEXT PRIMARY KEY,
    locale_language TEXT,
    voice_language TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )
`);

try {
  db.run(`ALTER TABLE user_settings ADD COLUMN locale_language TEXT`);
} catch {}
try {
  db.run(`ALTER TABLE user_settings ADD COLUMN voice_language TEXT`);
} catch {}
try {
  db.run(`ALTER TABLE user_settings ADD COLUMN is_premium INTEGER DEFAULT 0`);
} catch {}
try {
  db.run(`ALTER TABLE user_settings ADD COLUMN premium_until INTEGER`);
} catch {}
try {
  db.run(`ALTER TABLE server_settings ADD COLUMN locale_language TEXT`);
} catch {}
try {
  db.run(`ALTER TABLE server_settings ADD COLUMN voice_language TEXT`);
} catch {}
try {
  db.run(`ALTER TABLE user_settings ADD COLUMN tts_provider TEXT DEFAULT 'basic'`);
} catch {}
try {
  db.run(`UPDATE user_settings SET tts_provider = 'basic' WHERE tts_provider = 'standard'`);
  db.run(`UPDATE user_settings SET tts_provider = 'premium' WHERE tts_provider = 'wavenet'`);
} catch {}
try {
  db.run(`ALTER TABLE user_settings ADD COLUMN voice_name TEXT`);
} catch {}

try {
  db.run(
    `UPDATE user_settings SET locale_language = language WHERE locale_language IS NULL AND language IS NOT NULL`,
  );
  db.run(
    `UPDATE server_settings SET locale_language = language WHERE locale_language IS NULL AND language IS NOT NULL`,
  );
} catch {}

type UserSettingsRow = {
  locale_language: string | null;
  voice_language: string | null;
  is_premium: number;
  premium_until: number | null;
  tts_provider: string | null;
  voice_name: string | null;
};

type ServerSettingsRow = {
  locale_language: string | null;
  voice_language: string | null;
};

type PremiumRow = {
  is_premium: number;
  premium_until: number | null;
};

const getUserSettings = db.prepare<UserSettingsRow, [string]>(
  "SELECT locale_language, voice_language, is_premium, premium_until, tts_provider, voice_name FROM user_settings WHERE user_id = ?",
);

const getServerSettings = db.prepare<ServerSettingsRow, [string]>(
  "SELECT locale_language, voice_language FROM server_settings WHERE server_id = ?",
);

const getUserPremium = db.prepare<PremiumRow, [string]>(
  "SELECT is_premium, premium_until FROM user_settings WHERE user_id = ?",
);

const upsertUserPremium = db.prepare(
  `INSERT INTO user_settings (user_id, is_premium, premium_until, updated_at) VALUES (?, ?, ?, unixepoch())
   ON CONFLICT(user_id) DO UPDATE SET is_premium = excluded.is_premium, premium_until = excluded.premium_until, updated_at = unixepoch()`,
);

const upsertUserLocale = db.prepare(
  `INSERT INTO user_settings (user_id, locale_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(user_id) DO UPDATE SET locale_language = excluded.locale_language, updated_at = unixepoch()`,
);

const upsertUserVoice = db.prepare(
  `INSERT INTO user_settings (user_id, voice_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(user_id) DO UPDATE SET voice_language = excluded.voice_language, updated_at = unixepoch()`,
);

const upsertServerLocale = db.prepare(
  `INSERT INTO server_settings (server_id, locale_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(server_id) DO UPDATE SET locale_language = excluded.locale_language, updated_at = unixepoch()`,
);

const upsertServerVoice = db.prepare(
  `INSERT INTO server_settings (server_id, voice_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(server_id) DO UPDATE SET voice_language = excluded.voice_language, updated_at = unixepoch()`,
);

const upsertUserVoicePreferences = db.prepare(
  `INSERT INTO user_settings (user_id, tts_provider, voice_name, voice_language, updated_at) VALUES (?, ?, ?, ?, unixepoch())
   ON CONFLICT(user_id) DO UPDATE SET tts_provider = excluded.tts_provider, voice_name = excluded.voice_name, voice_language = excluded.voice_language, updated_at = unixepoch()`,
);

export function getUserLocale(userId: string): Locale | null {
  const row = getUserSettings.get(userId);
  return (row?.locale_language as Locale) ?? null;
}

export function setUserLocale(userId: string, locale: Locale): void {
  upsertUserLocale.run(userId, locale);
}

export function getUserVoice(userId: string): Locale | null {
  const row = getUserSettings.get(userId);
  return (row?.voice_language as Locale) ?? null;
}

export function setUserVoice(userId: string, voice: Locale): void {
  upsertUserVoice.run(userId, voice);
}

export function getServerLocale(serverId: string): Locale | null {
  const row = getServerSettings.get(serverId);
  return (row?.locale_language as Locale) ?? null;
}

export function setServerLocale(serverId: string, locale: Locale): void {
  upsertServerLocale.run(serverId, locale);
}

export function getServerVoice(serverId: string): Locale | null {
  const row = getServerSettings.get(serverId);
  return (row?.voice_language as Locale) ?? null;
}

export function setServerVoice(serverId: string, voice: Locale): void {
  upsertServerVoice.run(serverId, voice);
}

export function getLocale(interaction: ChatInputCommandInteraction): Locale {
  const userLocale = getUserLocale(interaction.user.id);
  if (userLocale) return userLocale;

  if (interaction.guildId) {
    const serverLocale = getServerLocale(interaction.guildId);
    if (serverLocale) return serverLocale;
  }

  return DEFAULT_LOCALE;
}

export function getVoiceLanguage(
  interaction: ChatInputCommandInteraction,
): Locale {
  const userVoice = getUserVoice(interaction.user.id);
  if (userVoice) return userVoice;

  if (interaction.guildId) {
    const serverVoice = getServerVoice(interaction.guildId);
    if (serverVoice) return serverVoice;
  }

  return DEFAULT_LOCALE;
}

export interface PremiumStatus {
  isPremium: boolean;
  premiumUntil: Date | null;
  isExpired: boolean;
}

/**
 * Check if a user has active premium status
 */
export function isPremiumUser(userId: string): boolean {
  const row = getUserPremium.get(userId);
  if (!row || !row.is_premium) return false;
  if (row.premium_until === null) return true;
  return row.premium_until * 1000 > Date.now();
}

/**
 * Get detailed premium status for a user
 */
export function getPremiumStatus(userId: string): PremiumStatus {
  const row = getUserPremium.get(userId);
  if (!row) {
    return { isPremium: false, premiumUntil: null, isExpired: false };
  }
  const premiumUntil = row.premium_until
    ? new Date(row.premium_until * 1000)
    : null;
  const isExpired = premiumUntil ? premiumUntil.getTime() < Date.now() : false;
  const isPremium = row.is_premium === 1 && !isExpired;
  return { isPremium, premiumUntil, isExpired };
}

/**
 * Set premium status for a user
 * @param userId Discord user ID
 * @param durationDays Number of days of premium, or null for lifetime
 */
export function setUserPremium(
  userId: string,
  durationDays: number | null,
): void {
  const premiumUntil = durationDays
    ? Math.floor((Date.now() + durationDays * 24 * 60 * 60 * 1000) / 1000)
    : null;
  upsertUserPremium.run(userId, 1, premiumUntil);
}

/**
 * Remove premium status from a user
 */
export function removeUserPremium(userId: string): void {
  upsertUserPremium.run(userId, 0, null);
}

/**
 * Get user's TTS voice preferences
 */
export function getUserVoicePreferences(userId: string): UserVoicePreferences {
  const row = getUserSettings.get(userId);
  let provider = (row?.tts_provider as TTSProviderType) || "basic";
  if (provider === "standard" as unknown) provider = "basic";
  if (provider === "wavenet" as unknown) provider = "premium";
  return {
    provider,
    voiceName: row?.voice_name || null,
    languageCode: row?.voice_language || "en",
  };
}

/**
 * Set user's TTS voice preferences
 */
export function setUserVoicePreferences(
  userId: string,
  preferences: Partial<UserVoicePreferences>,
): void {
  const current = getUserVoicePreferences(userId);
  const provider = preferences.provider ?? current.provider;
  const voiceName = preferences.voiceName ?? current.voiceName;
  const languageCode = preferences.languageCode ?? current.languageCode;
  upsertUserVoicePreferences.run(userId, provider, voiceName, languageCode);
}

/**
 * Reset user's voice to basic (free) mode
 */
export function resetUserToBasicVoice(userId: string): void {
  upsertUserVoicePreferences.run(userId, "basic", null, null);
}
