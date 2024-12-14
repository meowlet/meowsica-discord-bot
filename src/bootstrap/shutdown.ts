import type { AppContext } from "./app-context.ts";
import { closeAppContext } from "./cleanup.ts";

const SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
const FORCE_EXIT_TIMEOUT_MS = 10_000;
const FATAL_EXIT_TIMEOUT_MS = 2_000;

export function registerShutdown(ctx: AppContext): void {
  const state = { shuttingDown: false, crashing: false };
  const handler = async (signal: NodeJS.Signals): Promise<void> => {
    if (state.shuttingDown || state.crashing) return;
    state.shuttingDown = true;
    ctx.logger.info(`received ${signal}, shutting down`);
    const forceExitTimer = setTimeout(() => {
      ctx.logger.error("graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, FORCE_EXIT_TIMEOUT_MS);
    if (typeof forceExitTimer.unref === "function") forceExitTimer.unref();
    try {
      ctx.readyHandler.shutdown();
      ctx.player.shutdown();
      ctx.voice.shutdown();
      await closeAppContext(ctx, {
        destroyClient: true,
        logFlushTimeoutMs: 3_000,
        dbCloseTimeoutMs: 4_000,
      });
    } catch (err) {
      ctx.logger.error("error during shutdown", err);
    } finally {
      clearTimeout(forceExitTimer);
      process.exit(0);
    }
  };
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => {
      handler(signal).catch((err) => {
        ctx.logger.error("shutdown handler threw", err);
        process.exit(1);
      });
    });
  }
  process.on("uncaughtException", (err) => {
    ctx.logger.error("uncaught exception, exiting", err);
    safeExit(ctx, state, 1);
  });
  process.on("unhandledRejection", (reason) => {
    ctx.logger.error("unhandled rejection, exiting", reason as Error);
    safeExit(ctx, state, 1);
  });
}

interface ShutdownState {
  shuttingDown: boolean;
  crashing: boolean;
}

function safeExit(
  ctx: AppContext,
  state: ShutdownState,
  code: number,
): void {
  if (state.crashing || state.shuttingDown) return;
  state.crashing = true;
  const forceExit = setTimeout(() => process.exit(code), FATAL_EXIT_TIMEOUT_MS);
  forceExit.unref();
  void closeAppContext(ctx, {
    destroyClient: true,
    logFlushTimeoutMs: 1_000,
    dbCloseTimeoutMs: 1_000,
  })
    .catch((err) => ctx.logger.error("safeExit cleanup failed", err))
    .finally(() => process.exit(code));
}
