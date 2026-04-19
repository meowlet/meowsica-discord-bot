import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../infra/db.ts";
import { userUsage, type UserUsageRow } from "./schema.ts";

export interface UsageSnapshot {
  readonly charsUsed: number;
  readonly period: Date;
}

export interface UsageRepositoryDeps {
  readonly db: Db;
}

export class UsageRepository {
  private readonly db: Db;

  constructor(deps: UsageRepositoryDeps) {
    this.db = deps.db;
  }

  async getCurrent(userId: string): Promise<UsageSnapshot> {
    const period = currentPeriod();
    const rows = await this.db
      .select({
        charsUsed: userUsage.charsUsed,
        period: userUsage.period,
      })
      .from(userUsage)
      .where(and(eq(userUsage.userId, userId), eq(userUsage.period, period)))
      .limit(1);
    const row = rows[0];
    if (!row) return { charsUsed: 0, period };
    return { charsUsed: row.charsUsed, period: row.period };
  }

  async incrementCurrent(userId: string, chars: number): Promise<void> {
    if (chars <= 0) return;
    const period = currentPeriod();
    await this.db
      .insert(userUsage)
      .values({ userId, period, charsUsed: chars })
      .onConflictDoUpdate({
        target: [userUsage.userId, userUsage.period],
        set: {
          charsUsed: sql`${userUsage.charsUsed} + ${chars}`,
          updatedAt: sql`NOW()`,
        },
      });
  }

  async resetCurrent(userId: string): Promise<void> {
    const period = currentPeriod();
    await this.db
      .insert(userUsage)
      .values({ userId, period, charsUsed: 0 })
      .onConflictDoUpdate({
        target: [userUsage.userId, userUsage.period],
        set: { charsUsed: 0, updatedAt: sql`NOW()` },
      });
  }

  async getHistory(userId: string, months: number): Promise<UserUsageRow[]> {
    return this.db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, userId))
      .orderBy(sql`${userUsage.period} DESC`)
      .limit(months);
  }
}

function currentPeriod(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
