/**
 * Database Migration Script
 *
 * Migrates from the old "flat" user_settings table to the new normalized schema:
 * - subscriptions: Premium/subscription data
 * - user_preferences: User configuration (UI + TTS)
 *
 * This migration is transactional - if anything fails, it rolls back completely.
 */

import { Database } from "bun:sqlite";
import {
  SCHEMA,
  INDEXES,
  SCHEMA_VERSION,
  type SubscriptionTier,
  type TTSProvider,
} from "./schema.ts";

interface OldUserSettingsRow {
  user_id: string;
  locale_language: string | null;
  voice_language: string | null;
  is_premium: number;
  premium_until: number | null;
  tts_provider: string | null;
  voice_name: string | null;
  created_at: number | null;
  updated_at: number | null;
}

interface MigrationResult {
  success: boolean;
  migratedUsers: number;
  errors: string[];
}

/**
 * Check if the old user_settings table exists
 */
function hasOldUserSettingsTable(db: Database): boolean {
  const result = db
    .prepare<{ count: number }, []>(
      `SELECT COUNT(*) as count FROM sqlite_master 
       WHERE type='table' AND name='user_settings'`
    )
    .get();
  return (result?.count ?? 0) > 0;
}

/**
 * Check if migration has already been applied
 */
function getMigrationVersion(db: Database): number {
  try {
    const result = db
      .prepare<{ version: number }, []>(
        `SELECT MAX(version) as version FROM schema_migrations`
      )
      .get();
    return result?.version ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Normalize TTS provider value from old format
 */
function normalizeTTSProvider(provider: string | null): TTSProvider {
  if (!provider) return "basic";
  const normalized = provider.toLowerCase();
  if (normalized === "wavenet" || normalized === "premium") return "premium";
  return "basic";
}

/**
 * Determine subscription tier based on premium status
 */
function determineTier(isPremium: number): SubscriptionTier {
  return isPremium === 1 ? "encore" : "free";
}

/**
 * Run the migration from v1 (old flat table) to v2 (normalized tables)
 */
export function migrateToV2(db: Database): MigrationResult {
  const result: MigrationResult = {
    success: false,
    migratedUsers: 0,
    errors: [],
  };

  // Check current version
  const currentVersion = getMigrationVersion(db);
  if (currentVersion >= SCHEMA_VERSION) {
    result.success = true;
    return result;
  }

  // Check if old table exists
  const hasOldTable = hasOldUserSettingsTable(db);

  try {
    // Start transaction
    db.run("BEGIN TRANSACTION");

    // Create schema_migrations table first
    db.run(SCHEMA.schema_migrations);

    // Create new tables
    db.run(SCHEMA.subscriptions);
    db.run(SCHEMA.user_preferences);

    // Ensure server_settings exists (unchanged)
    db.run(SCHEMA.server_settings);

    // Create indexes
    for (const indexSql of Object.values(INDEXES)) {
      db.run(indexSql);
    }

    // If old table exists, migrate data
    if (hasOldTable) {
      const oldRows = db
        .prepare<OldUserSettingsRow, []>(`SELECT * FROM user_settings`)
        .all();

      const insertSubscription = db.prepare(`
        INSERT OR REPLACE INTO subscriptions (user_id, tier, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      const insertPreferences = db.prepare(`
        INSERT OR REPLACE INTO user_preferences 
        (user_id, ui_locale, tts_provider, tts_language, tts_voice_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const row of oldRows) {
        try {
          const now = Math.floor(Date.now() / 1000);
          const createdAt = row.created_at ?? now;
          const updatedAt = row.updated_at ?? now;

          // Migrate to subscriptions table
          const tier = determineTier(row.is_premium);
          // Only set expires_at if user has premium
          const expiresAt = row.is_premium === 1 ? row.premium_until : null;

          insertSubscription.run(
            row.user_id,
            tier,
            expiresAt,
            createdAt,
            updatedAt
          );

          // Migrate to user_preferences table
          const ttsProvider = normalizeTTSProvider(row.tts_provider);

          insertPreferences.run(
            row.user_id,
            row.locale_language,
            ttsProvider,
            row.voice_language,
            row.voice_name,
            createdAt,
            updatedAt
          );

          result.migratedUsers++;
        } catch (err) {
          result.errors.push(
            `Failed to migrate user ${row.user_id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      // Rename old table as backup (don't drop yet for safety)
      db.run(`ALTER TABLE user_settings RENAME TO user_settings_backup_v1`);
    }

    // Record migration version
    db.run(
      `INSERT INTO schema_migrations (version, applied_at) VALUES (?, unixepoch())`,
      [SCHEMA_VERSION]
    );

    // Commit transaction
    db.run("COMMIT");

    result.success = true;
    console.log(
      `[Migration] Successfully migrated to schema v${SCHEMA_VERSION}. Users migrated: ${result.migratedUsers}`
    );

    if (result.errors.length > 0) {
      console.warn(`[Migration] Warnings:`, result.errors);
    }
  } catch (err) {
    // Rollback on any error
    try {
      db.run("ROLLBACK");
    } catch {}

    const errorMessage =
      err instanceof Error ? err.message : String(err);
    result.errors.push(`Migration failed: ${errorMessage}`);
    console.error(`[Migration] Failed:`, errorMessage);
  }

  return result;
}

/**
 * Clean up old backup table after confirming migration success
 * Only call this after verifying the migration worked correctly!
 */
export function dropOldBackupTable(db: Database): boolean {
  try {
    const hasBackup = db
      .prepare<{ count: number }, []>(
        `SELECT COUNT(*) as count FROM sqlite_master 
         WHERE type='table' AND name='user_settings_backup_v1'`
      )
      .get();

    if ((hasBackup?.count ?? 0) > 0) {
      db.run(`DROP TABLE user_settings_backup_v1`);
      console.log("[Migration] Dropped backup table user_settings_backup_v1");
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Migration] Failed to drop backup table:", err);
    return false;
  }
}

/**
 * Initialize database with new schema (for fresh installs)
 */
export function initializeSchema(db: Database): void {
  const currentVersion = getMigrationVersion(db);

  if (currentVersion >= SCHEMA_VERSION) {
    return; // Already initialized
  }

  // Check if this is a fresh install or needs migration
  if (hasOldUserSettingsTable(db)) {
    migrateToV2(db);
  } else {
    // Fresh install - just create new tables
    db.run(SCHEMA.schema_migrations);
    db.run(SCHEMA.subscriptions);
    db.run(SCHEMA.user_preferences);
    db.run(SCHEMA.server_settings);

    for (const indexSql of Object.values(INDEXES)) {
      db.run(indexSql);
    }

    db.run(
      `INSERT INTO schema_migrations (version, applied_at) VALUES (?, unixepoch())`,
      [SCHEMA_VERSION]
    );

    console.log(`[Database] Initialized with schema v${SCHEMA_VERSION}`);
  }
}
