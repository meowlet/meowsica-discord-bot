/**
 * LoggerService - Dual-Database Activity Logging
 *
 * Logs rich interaction data into a separate SQLite database (logs.db)
 * to keep the main configuration DB clean.
 *
 * Features:
 * - Fire-and-forget writes (non-blocking)
 * - Full interaction context (user, guild, channel, command, input)
 * - Status tracking (success, error, quota_limit)
 * - Model/provider tracking for TTS commands
 */

import { Database } from "bun:sqlite";
import { logger } from "../utils/logger.ts";

const logServiceLogger = logger.withTag("LOG");

// ============================================================================
// Schema
// ============================================================================

/** Logs database path - same folder as settings.db */
const LOG_DB_PATH = "logs.db";

const COMMAND_LOGS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS command_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    guild_id TEXT,
    guild_name TEXT,
    channel_id TEXT,
    command TEXT NOT NULL,
    input TEXT,
    model TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'quota_limit'))
  )
`;

/** Migration to add model column if it doesn't exist */
const ADD_MODEL_COLUMN = `
  ALTER TABLE command_logs ADD COLUMN model TEXT
`;

const INDEXES = {
  timestamp: `CREATE INDEX IF NOT EXISTS idx_command_logs_timestamp ON command_logs(timestamp)`,
  user_id: `CREATE INDEX IF NOT EXISTS idx_command_logs_user_id ON command_logs(user_id)`,
  guild_id: `CREATE INDEX IF NOT EXISTS idx_command_logs_guild_id ON command_logs(guild_id)`,
  status: `CREATE INDEX IF NOT EXISTS idx_command_logs_status ON command_logs(status)`,
};

// ============================================================================
// Types
// ============================================================================

export type CommandLogStatus = "success" | "error" | "quota_limit";

export interface CommandLogEntry {
  userId: string;
  username: string;
  displayName?: string | null;
  guildId?: string | null;
  guildName?: string | null;
  channelId?: string | null;
  command: string;
  input?: string | null;
  model?: string | null;
  status: CommandLogStatus;
}

// ============================================================================
// Database Initialization
// ============================================================================

let logDb: Database | null = null;

/**
 * Initialize the logs database
 * Creates the database file if it doesn't exist (same folder as settings.db)
 */
export async function initializeLoggerService(): Promise<void> {
  try {
    // Initialize database (Bun creates the file automatically)
    logDb = new Database(LOG_DB_PATH);

    // Create schema
    logDb.run(COMMAND_LOGS_SCHEMA);

    // Run migration to add model column (safe to run multiple times)
    try {
      logDb.run(ADD_MODEL_COLUMN);
      logServiceLogger.debug("Added model column to command_logs");
    } catch {
      // Column already exists, ignore
    }

    // Create indexes
    for (const indexSql of Object.values(INDEXES)) {
      logDb.run(indexSql);
    }

    logServiceLogger.info(`Initialized logs database: ${LOG_DB_PATH}`);
  } catch (error) {
    logServiceLogger.error("Failed to initialize logs database:", error);
    // Don't throw - logging should not break the bot
  }
}

// ============================================================================
// Prepared Statements (lazy initialization)
// ============================================================================

let insertLogStmt: ReturnType<Database["prepare"]> | null = null;

function getInsertStatement(): ReturnType<Database["prepare"]> | null {
  if (!logDb) return null;
  if (!insertLogStmt) {
    insertLogStmt = logDb.prepare(`
      INSERT INTO command_logs (
        user_id, username, display_name, guild_id, guild_name, 
        channel_id, command, input, model, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }
  return insertLogStmt;
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Log a command interaction to the logs database
 * This is fire-and-forget - does not block or throw errors
 *
 * @param entry - The command log entry to record
 */
export function logCommand(entry: CommandLogEntry): void {
  // Fire-and-forget: use setImmediate to not block the event loop
  setImmediate(() => {
    try {
      const stmt = getInsertStatement();
      if (!stmt) return;

      stmt.run(
        entry.userId,
        entry.username,
        entry.displayName ?? null,
        entry.guildId ?? null,
        entry.guildName ?? null,
        entry.channelId ?? null,
        entry.command,
        entry.input ?? null,
        entry.model ?? null,
        entry.status
      );
    } catch (error) {
      // Silently fail - logging should never break the bot
      logServiceLogger.warn("Failed to log command:", error);
    }
  });
}

/**
 * Helper to extract log entry from a Discord ChatInputCommandInteraction
 * Uses `unknown` for member to handle Discord.js complex union types
 *
 * @param interaction - Discord interaction object
 * @param status - Command execution status
 * @param model - Optional TTS model name (e.g., "vi-VN-Wavenet-A" or "Basic")
 */
export function createLogEntryFromInteraction(
  interaction: {
    user: { id: string; username: string };
    member?: unknown;
    guild?: { id: string; name: string } | null;
    channelId: string;
    commandName: string;
    options: {
      data: ReadonlyArray<{ name: string; value?: unknown }>;
    };
  },
  status: CommandLogStatus,
  model?: string | null
): CommandLogEntry {
  // Serialize options to JSON
  const inputData: Record<string, unknown> = {};
  for (const opt of interaction.options.data) {
    if (opt.value !== undefined) {
      inputData[opt.name] = opt.value;
    }
  }

  // Safely extract display name from member (handles GuildMember and API types)
  let displayName: string | null = null;
  if (interaction.member && typeof interaction.member === "object") {
    const member = interaction.member as Record<string, unknown>;
    if (typeof member.displayName === "string") {
      displayName = member.displayName;
    } else if (typeof member.nickname === "string") {
      displayName = member.nickname;
    } else if (typeof member.nick === "string") {
      displayName = member.nick;
    }
  }

  return {
    userId: interaction.user.id,
    username: interaction.user.username,
    displayName,
    guildId: interaction.guild?.id ?? null,
    guildName: interaction.guild?.name ?? null,
    channelId: interaction.channelId,
    command: interaction.commandName,
    input: Object.keys(inputData).length > 0 ? JSON.stringify(inputData) : null,
    model: model ?? null,
    status,
  };
}

// ============================================================================
// Query Functions (for potential admin/stats features)
// ============================================================================

export interface CommandLogRow {
  id: number;
  timestamp: string;
  user_id: string;
  username: string;
  display_name: string | null;
  guild_id: string | null;
  guild_name: string | null;
  channel_id: string | null;
  command: string;
  input: string | null;
  model: string | null;
  status: CommandLogStatus;
}

/**
 * Get recent command logs (for admin/stats purposes)
 */
export function getRecentLogs(limit: number = 100): CommandLogRow[] {
  if (!logDb) return [];

  try {
    const stmt = logDb.prepare<CommandLogRow, [number]>(`
      SELECT * FROM command_logs 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  } catch (error) {
    logServiceLogger.error("Failed to get recent logs:", error);
    return [];
  }
}

/**
 * Get command usage stats for a user
 */
export function getUserCommandStats(
  userId: string
): { command: string; count: number }[] {
  if (!logDb) return [];

  try {
    const stmt = logDb.prepare<{ command: string; count: number }, [string]>(`
      SELECT command, COUNT(*) as count 
      FROM command_logs 
      WHERE user_id = ? 
      GROUP BY command 
      ORDER BY count DESC
    `);
    return stmt.all(userId);
  } catch (error) {
    logServiceLogger.error("Failed to get user stats:", error);
    return [];
  }
}

/**
 * Get error rate for monitoring
 */
export function getErrorRate(hours: number = 24): {
  total: number;
  errors: number;
  rate: number;
} {
  if (!logDb) return { total: 0, errors: 0, rate: 0 };

  try {
    const stmt = logDb.prepare<{ total: number; errors: number }, [string]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM command_logs 
      WHERE timestamp > datetime('now', ?)
    `);
    const result = stmt.get(`-${hours} hours`);
    if (!result) return { total: 0, errors: 0, rate: 0 };

    return {
      total: result.total,
      errors: result.errors,
      rate: result.total > 0 ? result.errors / result.total : 0,
    };
  } catch (error) {
    logServiceLogger.error("Failed to get error rate:", error);
    return { total: 0, errors: 0, rate: 0 };
  }
}

/**
 * Cleanup old logs (retention policy)
 */
export function cleanupOldLogs(daysToKeep: number = 30): number {
  if (!logDb) return 0;

  try {
    const stmt = logDb.prepare(`
      DELETE FROM command_logs 
      WHERE timestamp < datetime('now', ?)
    `);
    const result = stmt.run(`-${daysToKeep} days`);
    if (result.changes > 0) {
      logServiceLogger.info(`Cleaned up ${result.changes} old log entries`);
    }
    return result.changes;
  } catch (error) {
    logServiceLogger.error("Failed to cleanup old logs:", error);
    return 0;
  }
}
