/**
 * Bot Entry Point
 *
 * Creates and starts the BotClient. This file is used both in:
 * - Direct mode: Called from index.ts when sharding is disabled
 * - Sharded mode: Spawned by ShardingManager for each shard
 */

import { BotClient } from "./structs/BotClient.ts";
import { registerEvents } from "./events/index.ts";
import { getConfig } from "./config/index.ts";
import { botLogger } from "./utils/logger.ts";

/**
 * Create and configure the bot client
 */
export function createBot(): BotClient {
  const config = getConfig();

  botLogger.info("Creating bot client...");

  const client = new BotClient({ config });

  // Register all event handlers
  registerEvents(client);

  return client;
}

/**
 * Start the bot
 */
export async function startBot(): Promise<BotClient> {
  const client = createBot();

  try {
    await client.start();
    return client;
  } catch (error) {
    botLogger.error("Failed to start bot:", error);
    process.exit(1);
  }
}

// If this file is run directly (sharded mode), start the bot
// Bun.main returns the entry file path
if (import.meta.main) {
  const config = getConfig();
  const isSharded = process.env.SHARD_ID !== undefined;

  if (isSharded) {
    botLogger.info(`Starting as shard ${process.env.SHARD_ID}...`);
  } else {
    botLogger.info("Starting in direct mode...");
  }

  startBot();
}

export { BotClient };

