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

function createDbClient(params: CreateDbParams) {
  const client = new SQL({
    url: params.url,
    max: params.maxConnections ?? 10,
  });
  return drizzle({ client, schema, casing: "snake_case" });
}

export function createDb(params: CreateDbParams): Db {
  return createDbClient(params);
}
