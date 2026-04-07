/**
 * Database Schema Definitions
 *
 * Normalized schema separating:
 * 1. subscriptions - Premium/subscription data (business logic)
 * 2. user_preferences - User configuration (UI + TTS settings)
 * 3. server_settings - Server-level configuration
 */

export const SCHEMA_VERSION = 2;

/**
 * Subscription tiers
 */
export type SubscriptionTier = "free" | "encore";

/**
 * TTS provider types
 */
export type TTSProvider = "basic" | "premium";

/**
 * SQL Schema Definitions
 */
export const SCHEMA = {
  /**
   * Table: subscriptions
   * Purpose: Manage user premium/subscription status
   */
  subscriptions: `
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id TEXT PRIMARY KEY,
      tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'encore')),
      expires_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `,

  /**
   * Table: user_preferences
   * Purpose: Store user customization (UI locale + TTS settings)
   * 
   * Note on tts_speed constraints:
   * - For Basic provider: 0.25 = "Slow Mode", 1.0 = "Normal"
   * - For Premium provider: 0.25 to 4.0 range (Google Cloud limits)
   * - 0.25 serves as the "magic number" for Basic slow mode detection
   */
  user_preferences: `
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      ui_locale TEXT,
      tts_provider TEXT NOT NULL DEFAULT 'premium' CHECK (tts_provider IN ('basic', 'premium')),
      tts_language TEXT,
      tts_voice_id TEXT,
      tts_speed REAL NOT NULL DEFAULT 1.0 CHECK (tts_speed >= 0.25 AND tts_speed <= 4.0),
      tts_pitch REAL NOT NULL DEFAULT 0.0 CHECK (tts_pitch >= -20.0 AND tts_pitch <= 20.0),
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `,

  /**
   * Table: server_settings
   * Purpose: Server-level configuration (unchanged structure, kept for compatibility)
   */
  server_settings: `
    CREATE TABLE IF NOT EXISTS server_settings (
      server_id TEXT PRIMARY KEY,
      locale_language TEXT,
      voice_language TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `,

  /**
   * Table: schema_migrations
   * Purpose: Track schema version for migrations
   */
  schema_migrations: `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `,
} as const;

/**
 * Indexes for performance
 */
export const INDEXES = {
  // Index on expires_at for cleanup jobs (find expired subscriptions)
  subscriptions_expires_at: `
    CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at 
    ON subscriptions(expires_at) 
    WHERE expires_at IS NOT NULL
  `,

  // Index on tier for filtering by subscription level
  subscriptions_tier: `
    CREATE INDEX IF NOT EXISTS idx_subscriptions_tier 
    ON subscriptions(tier)
  `,

  // Index on tts_provider for filtering premium voice users
  user_preferences_tts_provider: `
    CREATE INDEX IF NOT EXISTS idx_user_preferences_tts_provider 
    ON user_preferences(tts_provider)
  `,
} as const;

/**
 * Row types for database queries
 */
export interface SubscriptionRow {
  user_id: string;
  tier: SubscriptionTier;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface UserPreferencesRow {
  user_id: string;
  ui_locale: string | null;
  tts_provider: TTSProvider;
  tts_language: string | null;
  tts_voice_id: string | null;
  tts_speed: number;
  tts_pitch: number;
  created_at: number;
  updated_at: number;
}

export interface ServerSettingsRow {
  server_id: string;
  locale_language: string | null;
  voice_language: string | null;
  created_at: number;
  updated_at: number;
}

export interface SchemaMigrationRow {
  version: number;
  applied_at: number;
}
