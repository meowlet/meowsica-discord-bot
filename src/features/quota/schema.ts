import { sql } from "drizzle-orm";
import {
  pgSchema,
  text,
  integer,
  date,
  timestamp,
  check,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

const appSchema = pgSchema("app");

export const userUsage = appSchema.table(
  "user_usage",
  {
    userId: text("user_id").notNull(),
    period: date("period", { mode: "date" }).notNull(),
    charsUsed: integer("chars_used").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.period] }),
    check("user_usage_chars_nonneg", sql`${t.charsUsed} >= 0`),
    index("user_usage_period_idx").on(t.period),
  ],
);

export type UserUsageRow = typeof userUsage.$inferSelect;
export type UserUsageInsert = typeof userUsage.$inferInsert;
