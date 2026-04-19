import type { AppContext } from "./app-context.ts";

const SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

export function registerShutdown(ctx: AppContext): void {
  let shuttingDown = false;
  const handler = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    ctx.logger.info(`received ${signal}, shutting down`);
    try {
      ctx.readyHandler.shutdown();
      ctx.player.shutdown();
      ctx.voice.shutdown();
      if (ctx.redis) ctx.redis.disconnect();
      ctx.client.destroy();
    } catch (err) {
      ctx.logger.error("error during shutdown", err);
    } finally {
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
    ctx.logger.error("uncaught exception", err);
  });
  process.on("unhandledRejection", (reason) => {
    ctx.logger.error("unhandled rejection", reason as Error);
  });
}
