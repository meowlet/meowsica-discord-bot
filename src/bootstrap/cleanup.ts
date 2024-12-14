import type { AppContext } from "./app-context.ts";
import { closeDb } from "../infra/db.ts";

export interface CloseAppContextOptions {
  readonly dbCloseTimeoutMs?: number;
  readonly logFlushTimeoutMs?: number;
  readonly destroyClient?: boolean;
}

export async function closeAppContext(
  ctx: AppContext,
  options: CloseAppContextOptions = {},
): Promise<void> {
  const dbTimeout = options.dbCloseTimeoutMs ?? 5_000;
  const flushTimeout = options.logFlushTimeoutMs ?? 3_000;
  const destroyClient = options.destroyClient ?? false;
  await runStep(ctx, "flush command logs", () =>
    ctx.commandLogger.flush(flushTimeout),
  );
  if (destroyClient) {
    await runStep(ctx, "destroy discord client", () => ctx.client.destroy());
  }
  await runStep(ctx, "close db", () => closeDb(ctx.db, dbTimeout));
  runStepSync(ctx, "disconnect redis", () => ctx.redis?.disconnect());
}

async function runStep(
  ctx: AppContext,
  label: string,
  fn: () => Promise<unknown> | unknown,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    ctx.logger.warn(`cleanup step '${label}' failed`, err);
  }
}

function runStepSync(
  ctx: AppContext,
  label: string,
  fn: () => unknown,
): void {
  try {
    fn();
  } catch (err) {
    ctx.logger.warn(`cleanup step '${label}' failed`, err);
  }
}
