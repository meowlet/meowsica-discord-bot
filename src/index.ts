/**
 * Application Entry Point
 *
 * Decides whether to start in sharded or direct mode based on configuration.
 *
 * Sharding Mode (ENABLE_SHARDING=true):
 *   - Uses ShardingManager to spawn multiple bot processes
 *   - Requires Redis for cross-shard data sharing
 *   - Each shard handles a subset of guilds
 *
 * Direct Mode (ENABLE_SHARDING=false, default):
 *   - Single bot process handles all guilds
 *   - Simpler setup, suitable for smaller bots
 *   - Redis is optional (for caching)
 */

import { getConfig } from "./config/index.ts";
import { createShardManager, startShardManager } from "./structs/ShardManager.ts";
import { startBot } from "./bot.ts";
import { logger } from "./utils/logger.ts";
import { join } from "node:path";

const mainLogger = logger.withTag("MAIN");

async function main(): Promise<void> {
  mainLogger.info("Meowsica Discord Bot Starting...");

  const config = getConfig();

  // Log configuration (without sensitive data)
  mainLogger.info(`Sharding: ${config.enableSharding ? "ENABLED" : "DISABLED"}`);
  mainLogger.info(`Redis: ${config.enableRedis ? "ENABLED" : "DISABLED"}`);
  mainLogger.info(`Debug: ${config.debug ? "ENABLED" : "DISABLED"}`);

  if (config.enableSharding) {
    await startWithSharding(config);
  } else {
    await startDirect();
  }
}

/**
 * Start with ShardingManager (multiple processes)
 */
async function startWithSharding(config: ReturnType<typeof getConfig>): Promise<void> {
  mainLogger.info("Starting in SHARDED mode...");

  // Get the bot.ts file path for ShardingManager to spawn
  const botFile = join(import.meta.dir, "bot.ts");

  mainLogger.debug(`Bot file path: ${botFile}`);

  const manager = createShardManager({
    config,
    botFile,
  });

  // Start spawning shards
  await startShardManager(manager);

  mainLogger.success("Shard manager running. Press Ctrl+C to stop.");

  // Handle graceful shutdown
  setupShutdown(() => {
    mainLogger.info("Shutting down shard manager...");
    // ShardingManager will handle shard cleanup
    process.exit(0);
  });
}

/**
 * Start directly (single process)
 */
async function startDirect(): Promise<void> {
  mainLogger.info("Starting in DIRECT mode (no sharding)...");

  const client = await startBot();

  // Handle graceful shutdown
  setupShutdown(async () => {
    mainLogger.info("Shutting down bot...");
    await client.shutdown();
    process.exit(0);
  });
}

/**
 * Setup graceful shutdown handlers
 */
function setupShutdown(handler: () => void | Promise<void>): void {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

  for (const signal of signals) {
    process.on(signal, () => {
      mainLogger.info(`Received ${signal}, initiating shutdown...`);
      handler();
    });
  }

  process.on("uncaughtException", (error) => {
    mainLogger.error("Uncaught exception:", error);
    handler();
  });

  process.on("unhandledRejection", (reason) => {
    mainLogger.error("Unhandled rejection:", reason);
  });
}

// Start the application
main().catch((error) => {
  mainLogger.error("Fatal error:", error);
  process.exit(1);
});
