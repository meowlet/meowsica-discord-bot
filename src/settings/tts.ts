/**
 * TTS Settings - Wrapper module for TTS-specific voice language settings
 *
 * This module provides a clean interface for TTS language settings,
 * delegating to the main db.ts repository using the new normalized schema.
 */

import type { ChatInputCommandInteraction } from "discord.js";
import {
  DEFAULT_VOICE_LANGUAGE,
  type VoiceLanguageCode,
} from "../tts/voices.ts";
import { isSupportedLanguage } from "../constants/languages.ts";
import {
  db,
  getUserVoice,
  setUserVoice,
  getServerVoice,
  setServerVoice,
} from "./db.ts";

// Re-export for backward compatibility with type-safe wrappers

export function getUserTTS(userId: string): VoiceLanguageCode | null {
  const lang = getUserVoice(userId);
  if (lang && isSupportedLanguage(lang)) {
    return lang as VoiceLanguageCode;
  }
  return null;
}

export function setUserTTS(userId: string, language: VoiceLanguageCode): void {
  setUserVoice(userId, language);
}

export function getServerTTS(serverId: string): VoiceLanguageCode | null {
  const lang = getServerVoice(serverId);
  if (lang && isSupportedLanguage(lang)) {
    return lang as VoiceLanguageCode;
  }
  return null;
}

export function setServerTTS(
  serverId: string,
  language: VoiceLanguageCode,
): void {
  setServerVoice(serverId, language);
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
