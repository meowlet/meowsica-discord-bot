import { migrate } from "drizzle-orm/bun-sql/migrator";
import type { Logger } from "../../shared/logger.ts";
import type { Db } from "../../infra/db.ts";

export interface SchemaMigratorDeps {
  readonly db: Db;
  readonly logger: Logger;
  readonly migrationsFolder?: string;
}

export class SchemaMigrator {
  private readonly db: Db;
  private readonly logger: Logger;
  private readonly migrationsFolder: string;

  constructor(deps: SchemaMigratorDeps) {
    this.db = deps.db;
    this.logger = deps.logger.withTag("MIGRATE");
    this.migrationsFolder = deps.migrationsFolder ?? "./drizzle";
  }

  async run(): Promise<void> {
    this.logger.info(`running migrations from ${this.migrationsFolder}`);
    await migrate(this.db, { migrationsFolder: this.migrationsFolder });
    this.logger.info("migrations applied");
  }
}
