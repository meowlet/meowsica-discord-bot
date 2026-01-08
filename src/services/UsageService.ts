/**
 * UsageService - Transparent Usage Quota System
 *
 * Enforces 100,000 characters/month limit for Encore (premium) users
 * with clear visibility. Stored in the main DB (settings.db).
 *
 * Features:
 * - Monthly quota tracking (100k chars/month)
 * - Automatic monthly reset
 * - Progress bar generation for profile display
 */

import { Database } from "bun:sqlite";
import { logger } from "../utils/logger.ts";

const usageLogger = logger.withTag("USAGE");

// ============================================================================
// Constants
// ============================================================================

/** Monthly character limit for Encore users */
export const MONTHLY_QUOTA_LIMIT = 100_000;

// ============================================================================
// Schema (to be added to main DB)
// ============================================================================

export const USER_USAGE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS user_usage (
    user_id TEXT PRIMARY KEY,
    chars_used INTEGER NOT NULL DEFAULT 0,
    month_year TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`;

export const USER_USAGE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_user_usage_month 
  ON user_usage(month_year)
`;

// ============================================================================
// Types
// ============================================================================

export interface UsageInfo {
  charsUsed: number;
  charsRemaining: number;
  limit: number;
  percentage: number;
  monthYear: string;
  isExceeded: boolean;
}

export interface UsageRow {
  user_id: string;
  chars_used: number;
  month_year: string;
  updated_at: number;
}

// ============================================================================
// Errors
// ============================================================================

export class QuotaExceededError extends Error {
  public readonly charsUsed: number;
  public readonly limit: number;

  constructor(charsUsed: number, limit: number) {
    super(
      `Quota exceeded: ${charsUsed.toLocaleString()}/${limit.toLocaleString()} characters used`
    );
    this.name = "QuotaExceededError";
    this.charsUsed = charsUsed;
    this.limit = limit;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get current month-year string in YYYY-MM format
 */
function getCurrentMonthYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Generate a text progress bar
 *
 * @param percentage - 0 to 100
 * @param length - Number of characters in the bar
 * @returns Progress bar string like [▓▓▓▓░░░░░░]
 */
export function generateProgressBar(
  percentage: number,
  length: number = 10
): string {
  const clampedPercent = Math.max(0, Math.min(100, percentage));
  const filledCount = Math.round((clampedPercent / 100) * length);
  const emptyCount = length - filledCount;

  const filled = "▓".repeat(filledCount);
  const empty = "░".repeat(emptyCount);

  return `[${filled}${empty}]`;
}

// ============================================================================
// UsageService Class
// ============================================================================

interface UsageQueryResult {
  chars_used: number;
  month_year: string;
}

export class UsageService {
  private db: Database;
  private getUsageStmt: ReturnType<Database["prepare"]>;
  private upsertUsageStmt: ReturnType<Database["prepare"]>;
  private incrementUsageStmt: ReturnType<Database["prepare"]>;
  private resetUsageStmt: ReturnType<Database["prepare"]>;

  constructor(db: Database) {
    this.db = db;

    // Ensure schema exists
    db.run(USER_USAGE_SCHEMA);
    db.run(USER_USAGE_INDEX);

    // Prepare statements
    this.getUsageStmt = db.prepare<
      { chars_used: number; month_year: string },
      [string, string]
    >(`
      SELECT chars_used, month_year 
      FROM user_usage 
      WHERE user_id = ? AND month_year = ?
    `);

    this.upsertUsageStmt = db.prepare(`
      INSERT INTO user_usage (user_id, chars_used, month_year, updated_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(user_id) DO UPDATE SET 
        chars_used = CASE 
          WHEN excluded.month_year != user_usage.month_year 
          THEN excluded.chars_used 
          ELSE user_usage.chars_used + excluded.chars_used 
        END,
        month_year = excluded.month_year,
        updated_at = unixepoch()
    `);

    this.incrementUsageStmt = db.prepare(`
      INSERT INTO user_usage (user_id, chars_used, month_year, updated_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(user_id) DO UPDATE SET 
        chars_used = CASE 
          WHEN excluded.month_year != user_usage.month_year 
          THEN excluded.chars_used 
          ELSE user_usage.chars_used + excluded.chars_used 
        END,
        month_year = excluded.month_year,
        updated_at = unixepoch()
    `);

    // Reset statement - always sets chars_used to the provided value (for admin reset)
    this.resetUsageStmt = db.prepare(`
      INSERT INTO user_usage (user_id, chars_used, month_year, updated_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(user_id) DO UPDATE SET 
        chars_used = excluded.chars_used,
        month_year = excluded.month_year,
        updated_at = unixepoch()
    `);
  }

  /**
   * Get usage info for a user
   */
  getUsage(userId: string): UsageInfo {
    const currentMonth = getCurrentMonthYear();
    const row = this.getUsageStmt.get(userId, currentMonth) as UsageQueryResult | null;

    const charsUsed = row?.chars_used ?? 0;
    const charsRemaining = Math.max(0, MONTHLY_QUOTA_LIMIT - charsUsed);
    const percentage = Math.round((charsUsed / MONTHLY_QUOTA_LIMIT) * 100);

    return {
      charsUsed,
      charsRemaining,
      limit: MONTHLY_QUOTA_LIMIT,
      percentage: Math.min(100, percentage),
      monthYear: currentMonth,
      isExceeded: charsUsed >= MONTHLY_QUOTA_LIMIT,
    };
  }

  /**
   * Check if user can use specified number of characters
   * Does NOT modify usage - call incrementUsage after successful synthesis
   *
   * @throws QuotaExceededError if quota would be exceeded
   */
  checkQuota(userId: string, charCount: number): void {
    const usage = this.getUsage(userId);

    if (usage.charsUsed + charCount > MONTHLY_QUOTA_LIMIT) {
      throw new QuotaExceededError(usage.charsUsed, MONTHLY_QUOTA_LIMIT);
    }
  }

  /**
   * Increment usage after successful TTS synthesis
   * Handles automatic monthly reset
   */
  incrementUsage(userId: string, charCount: number): void {
    const currentMonth = getCurrentMonthYear();
    this.incrementUsageStmt.run(userId, charCount, currentMonth);
  }

  /**
   * Get formatted usage string for profile display
   * @returns String like "[▓▓▓▓░░░░░░] 40% (40,000 / 100,000)"
   */
  getFormattedUsage(userId: string): string {
    const usage = this.getUsage(userId);
    const bar = generateProgressBar(usage.percentage);
    const used = usage.charsUsed.toLocaleString();
    const limit = usage.limit.toLocaleString();

    return `${bar} ${usage.percentage}% (${used} / ${limit})`;
  }

  /**
   * Reset usage for a user (admin function)
   * Uses dedicated reset statement that sets chars_used to 0 directly
   */
  resetUsage(userId: string): void {
    const currentMonth = getCurrentMonthYear();
    this.resetUsageStmt.run(userId, 0, currentMonth);
  }

  /**
   * Get all users with usage data (for admin/stats)
   */
  getAllUsageStats(): { userId: string; usage: UsageInfo }[] {
    const currentMonth = getCurrentMonthYear();
    const stmt = this.db.prepare<UsageRow, [string]>(`
      SELECT * FROM user_usage WHERE month_year = ?
    `);
    const rows = stmt.all(currentMonth);

    return rows.map((row) => ({
      userId: row.user_id,
      usage: {
        charsUsed: row.chars_used,
        charsRemaining: Math.max(0, MONTHLY_QUOTA_LIMIT - row.chars_used),
        limit: MONTHLY_QUOTA_LIMIT,
        percentage: Math.min(
          100,
          Math.round((row.chars_used / MONTHLY_QUOTA_LIMIT) * 100)
        ),
        monthYear: row.month_year,
        isExceeded: row.chars_used >= MONTHLY_QUOTA_LIMIT,
      },
    }));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let usageServiceInstance: UsageService | null = null;

/**
 * Initialize the UsageService with the main database
 */
export function initializeUsageService(db: Database): UsageService {
  usageServiceInstance = new UsageService(db);
  usageLogger.info(`Initialized with quota limit: ${MONTHLY_QUOTA_LIMIT.toLocaleString()}`);
  return usageServiceInstance;
}

/**
 * Get the UsageService instance
 * @throws Error if not initialized
 */
export function getUsageService(): UsageService {
  if (!usageServiceInstance) {
    throw new Error("UsageService not initialized. Call initializeUsageService first.");
  }
  return usageServiceInstance;
}
