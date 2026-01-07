import { Database } from "bun:sqlite";
import type { ChatInputCommandInteraction } from "discord.js";
import {
  DEFAULT_VOICE_LANGUAGE,
  type VoiceLanguageCode,
} from "../tts/voices.ts";
import { isSupportedLanguage } from "../constants/languages.ts";

const db = new Database("settings.db");

const getUserVoiceLanguage = db.prepare<
  { voice_language: string | null },
  [string]
>("SELECT voice_language FROM user_settings WHERE user_id = ?");

const getServerVoiceLanguage = db.prepare<
  { voice_language: string | null },
  [string]
>("SELECT voice_language FROM server_settings WHERE server_id = ?");

const upsertUserVoiceLanguage = db.prepare(
  `INSERT INTO user_settings (user_id, voice_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(user_id) DO UPDATE SET voice_language = excluded.voice_language, updated_at = unixepoch()`,
);

const upsertServerVoiceLanguage = db.prepare(
  `INSERT INTO server_settings (server_id, voice_language, updated_at) VALUES (?, ?, unixepoch())
   ON CONFLICT(server_id) DO UPDATE SET voice_language = excluded.voice_language, updated_at = unixepoch()`,
);

export function getUserTTS(userId: string): VoiceLanguageCode | null {
  const row = getUserVoiceLanguage.get(userId);
  const lang = row?.voice_language;
  if (lang && isSupportedLanguage(lang)) {
    return lang as VoiceLanguageCode;
  }
  return null;
}

export function setUserTTS(userId: string, language: VoiceLanguageCode): void {
  upsertUserVoiceLanguage.run(userId, language);
}

export function getServerTTS(serverId: string): VoiceLanguageCode | null {
  const row = getServerVoiceLanguage.get(serverId);
  const lang = row?.voice_language;
  if (lang && isSupportedLanguage(lang)) {
    return lang as VoiceLanguageCode;
  }
  return null;
}

export function setServerTTS(
  serverId: string,
  language: VoiceLanguageCode,
): void {
  upsertServerVoiceLanguage.run(serverId, language);
}

export function getTTSLanguage(
  interaction: ChatInputCommandInteraction,
): VoiceLanguageCode {
  const userTTS = getUserTTS(interaction.user.id);
  if (userTTS) return userTTS;

  if (interaction.guildId) {
    const serverTTS = getServerTTS(interaction.guildId);
    if (serverTTS) return serverTTS;
  }

  return DEFAULT_VOICE_LANGUAGE;
}
