/**
 * TTS Settings Management
 *
 * Handles user and server TTS language preferences.
 * TTS language is separate from UI locale - users can have English UI
 * but speak in Japanese, Vietnamese, etc.
 */

import { Database } from "bun:sqlite";
import type { ChatInputCommandInteraction } from "discord.js";
import {
  DEFAULT_VOICE_LANGUAGE,
  isValidVoiceLanguage,
  type VoiceLanguageCode,
} from "../tts/voices.ts";

const db = new Database("settings.db");

// Ensure tts_language columns exist (migration)
try {
  db.run(`ALTER TABLE user_settings ADD COLUMN tts_language TEXT`);
} catch {
  // Column already exists
}

try {
  db.run(`ALTER TABLE server_settings ADD COLUMN tts_language TEXT`);
} catch {
  // Column already exists
}

// Prepared statements for TTS language
const getUserTTSLanguage = db.prepare<{ tts_language: string | null }, [string]>(
  "SELECT tts_language FROM user_settings WHERE user_id = ?"
);

const getServerTTSLanguage = db.prepare<{ tts_language: string | null }, [string]>(
  "SELECT tts_language FROM server_settings WHERE server_id = ?"
);

const upsertUserTTSLanguage = db.prepare(
  `INSERT INTO user_settings (user_id, tts_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(user_id) DO UPDATE SET tts_language = excluded.tts_language, updated_at = unixepoch()`
);

const upsertServerTTSLanguage = db.prepare(
  `INSERT INTO server_settings (server_id, tts_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(server_id) DO UPDATE SET tts_language = excluded.tts_language, updated_at = unixepoch()`
);

/**
 * Get user's TTS language preference
 */
export function getUserTTS(userId: string): VoiceLanguageCode | null {
  const row = getUserTTSLanguage.get(userId);
  const lang = row?.tts_language;
  if (lang && isValidVoiceLanguage(lang)) {
    return lang;
  }
  return null;
}

/**
 * Set user's TTS language preference
 */
export function setUserTTS(userId: string, language: VoiceLanguageCode): void {
  upsertUserTTSLanguage.run(userId, language);
}

/**
 * Get server's default TTS language
 */
export function getServerTTS(serverId: string): VoiceLanguageCode | null {
  const row = getServerTTSLanguage.get(serverId);
  const lang = row?.tts_language;
  if (lang && isValidVoiceLanguage(lang)) {
    return lang;
  }
  return null;
}

/**
 * Set server's default TTS language
 */
export function setServerTTS(serverId: string, language: VoiceLanguageCode): void {
  upsertServerTTSLanguage.run(serverId, language);
}

/**
 * Get TTS language for an interaction with priority:
 * 1. User setting (if set)
 * 2. Server setting (if set and in a guild)
 * 3. Default language (en)
 */
export function getTTSLanguage(interaction: ChatInputCommandInteraction): VoiceLanguageCode {
  // Check user preference first
  const userTTS = getUserTTS(interaction.user.id);
  if (userTTS) return userTTS;

  // Check server preference
  if (interaction.guildId) {
    const serverTTS = getServerTTS(interaction.guildId);
    if (serverTTS) return serverTTS;
  }

  return DEFAULT_VOICE_LANGUAGE;
}
