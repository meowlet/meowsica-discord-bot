/**
 * Database Repository - Refactored
 *
 * Clean separation of concerns:
 * - Subscription functions query only `subscriptions` table
 * - Preferences functions query only `user_preferences` table
 * - Server functions query only `server_settings` table
 */

import { Database } from "bun:sqlite";
import type { ChatInputCommandInteraction } from "discord.js";
import { DEFAULT_LOCALE, type Locale } from "../i18n/index.ts";
import { DEFAULT_VOICE_LANGUAGE } from "../tts/voices.ts";
import { initializeSchema } from "./migration.ts";
import {
  type SubscriptionTier,
  type TTSProvider,
  type SubscriptionRow,
  type UserPreferencesRow,
  type ServerSettingsRow,
} from "./schema.ts";

// ============================================================================
// Database Initialization
// ============================================================================

const db = new Database("settings.db");

// Run migration/initialization
initializeSchema(db);

/**
 * Get the main database instance
 * Used by services that need direct DB access (e.g., UsageService)
 */
export function getDatabase(): Database {
  return db;
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface PremiumStatus {
  isPremium: boolean;
  tier: SubscriptionTier;
  expiresAt: Date | null;
  isExpired: boolean;
  isLifetime: boolean;
}

export interface UserTTSProfile {
  provider: TTSProvider;
  language: string | null;
  voiceId: string | null;
  speed: number;
  pitch: number;
}

export interface UserVoicePreferences {
  provider: TTSProvider;
  voiceName: string | null;
  languageCode: string;
}

// ============================================================================
// Prepared Statements - Subscriptions
// ============================================================================

const getSubscription = db.prepare<
  Pick<SubscriptionRow, "tier" | "expires_at">,
  [string]
>(`SELECT tier, expires_at FROM subscriptions WHERE user_id = ?`);

const upsertSubscription = db.prepare(`
  INSERT INTO subscriptions (user_id, tier, expires_at, updated_at)
  VALUES (?, ?, ?, unixepoch())
  ON CONFLICT(user_id) DO UPDATE SET 
    tier = excluded.tier, 
    expires_at = excluded.expires_at, 
    updated_at = unixepoch()
`);

// ============================================================================
// Prepared Statements - User Preferences
// ============================================================================

const getUserPrefs = db.prepare<
  Pick<
    UserPreferencesRow,
    | "ui_locale"
    | "tts_provider"
    | "tts_language"
    | "tts_voice_id"
    | "tts_speed"
    | "tts_pitch"
  >,
  [string]
>(`
  SELECT ui_locale, tts_provider, tts_language, tts_voice_id, tts_speed, tts_pitch 
  FROM user_preferences 
  WHERE user_id = ?
`);

const getUserLocaleStmt = db.prepare<Pick<UserPreferencesRow, "ui_locale">, [string]>(
  `SELECT ui_locale FROM user_preferences WHERE user_id = ?`
);

const getUserTTSStmt = db.prepare<
  Pick<UserPreferencesRow, "tts_provider" | "tts_language" | "tts_voice_id" | "tts_speed" | "tts_pitch">,
  [string]
>(`
  SELECT tts_provider, tts_language, tts_voice_id, tts_speed, tts_pitch 
  FROM user_preferences 
  WHERE user_id = ?
`);

const upsertUserLocale = db.prepare(`
  INSERT INTO user_preferences (user_id, ui_locale, updated_at)
  VALUES (?, ?, unixepoch())
  ON CONFLICT(user_id) DO UPDATE SET 
    ui_locale = excluded.ui_locale, 
    updated_at = unixepoch()
`);

const upsertUserTTS = db.prepare(`
  INSERT INTO user_preferences (user_id, tts_provider, tts_language, tts_voice_id, tts_speed, tts_pitch, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, unixepoch())
  ON CONFLICT(user_id) DO UPDATE SET 
    tts_provider = excluded.tts_provider,
    tts_language = excluded.tts_language,
    tts_voice_id = excluded.tts_voice_id,
    tts_speed = excluded.tts_speed,
    tts_pitch = excluded.tts_pitch,
    updated_at = unixepoch()
`);

const upsertUserTTSLanguage = db.prepare(`
  INSERT INTO user_preferences (user_id, tts_language, updated_at)
  VALUES (?, ?, unixepoch())
  ON CONFLICT(user_id) DO UPDATE SET 
    tts_language = excluded.tts_language, 
    updated_at = unixepoch()
`);

// ============================================================================
// Prepared Statements - Server Settings
// ============================================================================

const getServerSettingsStmt = db.prepare<
  Pick<ServerSettingsRow, "locale_language" | "voice_language">,
  [string]
>(`SELECT locale_language, voice_language FROM server_settings WHERE server_id = ?`);

const upsertServerLocale = db.prepare(`
  INSERT INTO server_settings (server_id, locale_language, updated_at)
  VALUES (?, ?, unixepoch())
  ON CONFLICT(server_id) DO UPDATE SET 
    locale_language = excluded.locale_language, 
    updated_at = unixepoch()
`);

const upsertServerVoice = db.prepare(`
  INSERT INTO server_settings (server_id, voice_language, updated_at)
  VALUES (?, ?, unixepoch())
  ON CONFLICT(server_id) DO UPDATE SET 
    voice_language = excluded.voice_language, 
    updated_at = unixepoch()
`);

// ============================================================================
// Subscription Functions
// ============================================================================

/**
 * Check if a user has active premium status
 */
export function isPremiumUser(userId: string): boolean {
  const row = getSubscription.get(userId);
  if (!row || row.tier === "free") return false;
  if (row.expires_at === null) return true; // Lifetime
  return row.expires_at * 1000 > Date.now();
}

/**
 * Get detailed premium status for a user
 */
export function getPremiumStatus(userId: string): PremiumStatus {
  const row = getSubscription.get(userId);

  if (!row || row.tier === "free") {
    return {
      isPremium: false,
      tier: "free",
      expiresAt: null,
      isExpired: false,
      isLifetime: false,
    };
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at * 1000) : null;
  const isLifetime = row.expires_at === null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  const isPremium = !isExpired;

  return {
    isPremium,
    tier: row.tier as SubscriptionTier,
    expiresAt,
    isExpired,
    isLifetime,
  };
}

/**
 * Set premium status for a user
 * @param userId Discord user ID
 * @param durationDays Number of days of premium, or null for lifetime
 * @param tier Subscription tier (default: 'encore')
 */
export function setUserPremium(
  userId: string,
  durationDays: number | null,
  tier: SubscriptionTier = "encore"
): void {
  const expiresAt = durationDays
    ? Math.floor((Date.now() + durationDays * 24 * 60 * 60 * 1000) / 1000)
    : null;
  upsertSubscription.run(userId, tier, expiresAt);
}

/**
 * Remove premium status from a user
 */
export function removeUserPremium(userId: string): void {
  upsertSubscription.run(userId, "free", null);
}

/**
 * Get subscription tier for a user
 */
export function getUserTier(userId: string): SubscriptionTier {
  const row = getSubscription.get(userId);
  return (row?.tier as SubscriptionTier) ?? "free";
}

// ============================================================================
// User Preferences - UI Locale
// ============================================================================

/**
 * Get user's UI locale preference
 */
export function getUserLocale(userId: string): Locale | null {
  const row = getUserLocaleStmt.get(userId);
  return (row?.ui_locale as Locale) ?? null;
}

/**
 * Set user's UI locale preference
 */
export function setUserLocale(userId: string, locale: Locale): void {
  upsertUserLocale.run(userId, locale);
}

// ============================================================================
// User Preferences - TTS Settings
// ============================================================================

/**
 * Get user's complete TTS profile
 */
export function getUserTTSProfile(userId: string): UserTTSProfile {
  const row = getUserTTSStmt.get(userId);

  return {
    provider: (row?.tts_provider as TTSProvider) ?? "basic",
    language: row?.tts_language ?? null,
    voiceId: row?.tts_voice_id ?? null,
    speed: row?.tts_speed ?? 1.0,
    pitch: row?.tts_pitch ?? 0.0,
  };
}

/**
 * Get user's TTS voice preferences (legacy compatibility)
 */
export function getUserVoicePreferences(userId: string): UserVoicePreferences {
  const profile = getUserTTSProfile(userId);
  return {
    provider: profile.provider,
    voiceName: profile.voiceId,
    languageCode: profile.language ?? DEFAULT_VOICE_LANGUAGE,
  };
}

/**
 * Set user's complete TTS profile
 */
export function setUserTTSProfile(
  userId: string,
  profile: Partial<UserTTSProfile>
): void {
  const current = getUserTTSProfile(userId);

  // For non-nullable fields, use ?? to merge with current values
  const provider = profile.provider ?? current.provider;
  const speed = profile.speed ?? current.speed;
  const pitch = profile.pitch ?? current.pitch;

  // For nullable fields, check if property exists in profile object
  // This allows explicit null values to clear the field
  // If property is undefined (not provided), use current value
  const language =
    "language" in profile && profile.language !== undefined
      ? profile.language
      : current.language;
  const voiceId =
    "voiceId" in profile && profile.voiceId !== undefined
      ? profile.voiceId
      : current.voiceId;

  upsertUserTTS.run(userId, provider, language, voiceId, speed, pitch);
}

/**
 * Set user's TTS voice preferences (legacy compatibility)
 */
export function setUserVoicePreferences(
  userId: string,
  preferences: Partial<UserVoicePreferences>
): void {
  setUserTTSProfile(userId, {
    provider: preferences.provider,
    language: preferences.languageCode,
    voiceId: preferences.voiceName,
  });
}

/**
 * Get user's TTS language only
 */
export function getUserVoice(userId: string): Locale | null {
  const row = getUserTTSStmt.get(userId);
  return (row?.tts_language as Locale) ?? null;
}

/**
 * Set user's TTS language only
 */
export function setUserVoice(userId: string, language: string): void {
  upsertUserTTSLanguage.run(userId, language);
}

/**
 * Reset user's voice to basic (free) mode
 */
export function resetUserToBasicVoice(userId: string): void {
  upsertUserTTS.run(userId, "basic", null, null, 1.0, 0.0);
}

// ============================================================================
// Server Settings
// ============================================================================

/**
 * Get server's locale preference
 */
export function getServerLocale(serverId: string): Locale | null {
  const row = getServerSettingsStmt.get(serverId);
  return (row?.locale_language as Locale) ?? null;
}

/**
 * Set server's locale preference
 */
export function setServerLocale(serverId: string, locale: Locale): void {
  upsertServerLocale.run(serverId, locale);
}

/**
 * Get server's TTS voice language
 */
export function getServerVoice(serverId: string): Locale | null {
  const row = getServerSettingsStmt.get(serverId);
  return (row?.voice_language as Locale) ?? null;
}

/**
 * Set server's TTS voice language
 */
export function setServerVoice(serverId: string, voice: string): void {
  upsertServerVoice.run(serverId, voice);
}

// ============================================================================
// Combined Helpers (for commands)
// ============================================================================

/**
 * Get effective locale for an interaction (user > server > default)
 */
export function getLocale(interaction: ChatInputCommandInteraction): Locale {
  const userLocale = getUserLocale(interaction.user.id);
  if (userLocale) return userLocale;

  if (interaction.guildId) {
    const serverLocale = getServerLocale(interaction.guildId);
    if (serverLocale) return serverLocale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Get effective voice language for an interaction (user > server > default)
 */
export function getVoiceLanguage(
  interaction: ChatInputCommandInteraction
): Locale {
  const userVoice = getUserVoice(interaction.user.id);
  if (userVoice) return userVoice;

  if (interaction.guildId) {
    const serverVoice = getServerVoice(interaction.guildId);
    if (serverVoice) return serverVoice;
  }

  return DEFAULT_LOCALE;
}

// ============================================================================
// Database Export (for advanced use)
// ============================================================================

export { db };
