import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as settingsSchema from "../features/settings/schema.ts";
import * as quotaSchema from "../features/quota/schema.ts";
import * as logsSchema from "../features/logs/schema.ts";

export interface CreateDbParams {
  readonly url: string;
  readonly maxConnections?: number;
}

const schema = {
  ...settingsSchema,
  ...quotaSchema,
  ...logsSchema,
};

export type Db = ReturnType<typeof createDbClient>;

const sqlClients = new WeakMap<object, SQL>();

function createDbClient(params: CreateDbParams) {
  const client = new SQL({
    url: params.url,
    max: params.maxConnections ?? 10,
  });
  const db = drizzle({ client, schema, casing: "snake_case" });
  sqlClients.set(db, client);
  return db;
}

export function createDb(params: CreateDbParams): Db {
  return createDbClient(params);
}

export async function closeDb(db: Db, timeoutMs = 5_000): Promise<void> {
  const client = sqlClients.get(db);
  if (!client) return;
  sqlClients.delete(db);
  await client.close({ timeout: Math.max(0, Math.ceil(timeoutMs / 1000)) });
}
