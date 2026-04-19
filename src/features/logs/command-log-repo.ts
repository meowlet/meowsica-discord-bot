import { desc, eq } from "drizzle-orm";
import type { Db } from "../../infra/db.ts";
import { commandLogs, type CommandLogRow } from "./schema.ts";

export interface CommandLogRepoDeps {
  readonly db: Db;
}

export class CommandLogRepository {
  private readonly db: Db;

  constructor(deps: CommandLogRepoDeps) {
    this.db = deps.db;
  }

  async getRecent(limit: number): Promise<CommandLogRow[]> {
    return this.db
      .select()
      .from(commandLogs)
      .orderBy(desc(commandLogs.at))
      .limit(limit);
  }

  async getByUser(userId: string, limit: number): Promise<CommandLogRow[]> {
    return this.db
      .select()
      .from(commandLogs)
      .where(eq(commandLogs.userId, userId))
      .orderBy(desc(commandLogs.at))
      .limit(limit);
  }
}
