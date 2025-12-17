import { Database } from "bun:sqlite";
import type { Locale } from "../i18n/index.ts";

const db = new Database("settings.db");

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    locale_language TEXT,
    voice_language TEXT,
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

// Migration: add new columns if they don't exist
try {
  db.run(`ALTER TABLE user_settings ADD COLUMN locale_language TEXT`);
} catch {}
try {
  db.run(`ALTER TABLE user_settings ADD COLUMN voice_language TEXT`);
} catch {}
try {
  db.run(`ALTER TABLE server_settings ADD COLUMN locale_language TEXT`);
} catch {}
try {
  db.run(`ALTER TABLE server_settings ADD COLUMN voice_language TEXT`);
} catch {}

// Migrate old 'language' column data to 'locale_language' if exists
try {
  db.run(`UPDATE user_settings SET locale_language = language WHERE locale_language IS NULL AND language IS NOT NULL`);
  db.run(`UPDATE server_settings SET locale_language = language WHERE locale_language IS NULL AND language IS NOT NULL`);
} catch {}

type UserSettingsRow = {
  locale_language: string | null;
  voice_language: string | null;
};

type ServerSettingsRow = {
  locale_language: string | null;
  voice_language: string | null;
};

// Prepared statements
const getUserSettings = db.prepare<UserSettingsRow, [string]>(
  "SELECT locale_language, voice_language FROM user_settings WHERE user_id = ?"
);

const getServerSettings = db.prepare<ServerSettingsRow, [string]>(
  "SELECT locale_language, voice_language FROM server_settings WHERE server_id = ?"
);

const upsertUserLocale = db.prepare(
  `INSERT INTO user_settings (user_id, locale_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(user_id) DO UPDATE SET locale_language = excluded.locale_language, updated_at = unixepoch()`
);

const upsertUserVoice = db.prepare(
  `INSERT INTO user_settings (user_id, voice_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(user_id) DO UPDATE SET voice_language = excluded.voice_language, updated_at = unixepoch()`
);

const upsertServerLocale = db.prepare(
  `INSERT INTO server_settings (server_id, locale_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(server_id) DO UPDATE SET locale_language = excluded.locale_language, updated_at = unixepoch()`
);

const upsertServerVoice = db.prepare(
  `INSERT INTO server_settings (server_id, voice_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(server_id) DO UPDATE SET voice_language = excluded.voice_language, updated_at = unixepoch()`
);

// User settings - Locale
export function getUserLocale(userId: string): Locale | null {
  const row = getUserSettings.get(userId);
  return (row?.locale_language as Locale) ?? null;
}

export function setUserLocale(userId: string, locale: Locale): void {
  upsertUserLocale.run(userId, locale);
}

// User settings - Voice
export function getUserVoice(userId: string): Locale | null {
  const row = getUserSettings.get(userId);
  return (row?.voice_language as Locale) ?? null;
}

export function setUserVoice(userId: string, voice: Locale): void {
  upsertUserVoice.run(userId, voice);
}

// Server settings - Locale
export function getServerLocale(serverId: string): Locale | null {
  const row = getServerSettings.get(serverId);
  return (row?.locale_language as Locale) ?? null;
}

export function setServerLocale(serverId: string, locale: Locale): void {
  upsertServerLocale.run(serverId, locale);
}

// Server settings - Voice
export function getServerVoice(serverId: string): Locale | null {
  const row = getServerSettings.get(serverId);
  return (row?.voice_language as Locale) ?? null;
}

export function setServerVoice(serverId: string, voice: Locale): void {
  upsertServerVoice.run(serverId, voice);
}
