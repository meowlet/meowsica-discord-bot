import {
  pgSchema,
  text,
  bigint,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const logsSchema = pgSchema("logs");

export const commandLogStatusEnum = pgEnum("command_log_status", [
  "success",
  "error",
  "quota_limit",
]);

export const commandLogs = logsSchema.table(
  "command_logs",
  {
    id: bigint("id", { mode: "bigint" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    guildId: text("guild_id"),
    guildName: text("guild_name"),
    channelId: text("channel_id"),
    command: text("command").notNull(),
    input: jsonb("input").$type<Record<string, unknown> | null>(),
    model: text("model"),
    status: commandLogStatusEnum("status").notNull(),
  },
  (t) => [
    index("command_logs_at_idx").on(t.at),
    index("command_logs_user_at_idx").on(t.userId, t.at),
    index("command_logs_guild_at_idx").on(t.guildId, t.at),
    index("command_logs_status_at_idx").on(t.status, t.at),
  ],
);

export type CommandLogRow = typeof commandLogs.$inferSelect;
export type CommandLogInsert = typeof commandLogs.$inferInsert;
export type CommandLogStatus = (typeof commandLogStatusEnum.enumValues)[number];
