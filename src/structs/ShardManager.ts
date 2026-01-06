/**
 * Shard Manager
 *
 * Manages Discord.js sharding for scaling across multiple processes.
 * Uses Redis for cross-shard communication when enabled.
 */

import { ShardingManager, type ShardingManagerOptions } from "discord.js";
import { getShardingConfig, type ShardingConfig, type BotConfig } from "../config/index.ts";
import { logger } from "../utils/logger.ts";
import { join } from "node:path";

const shardLogger = logger.withTag("SHARD");

interface ShardManagerOptions {
  config: BotConfig;
  botFile: string;
}

/**
 * Create and configure a ShardingManager
 */
export function createShardManager(options: ShardManagerOptions): ShardingManager {
  const shardingConfig = getShardingConfig();

  shardLogger.info("Creating ShardingManager...");
  shardLogger.info(`Bot file: ${options.botFile}`);
  shardLogger.info(`Shard count: ${shardingConfig.shardCount}`);

  const managerOptions: ShardingManagerOptions = {
    token: options.config.token,
    totalShards: shardingConfig.shardCount === "auto" ? "auto" : shardingConfig.shardCount,
    respawn: true,
    execArgv: ["--conditions=bun"], // Use Bun runtime
  };

  const manager = new ShardingManager(options.botFile, managerOptions);

  // Register event handlers
  registerShardEvents(manager);

  return manager;
}

/**
 * Register shard lifecycle event handlers
 */
function registerShardEvents(manager: ShardingManager): void {
  manager.on("shardCreate", (shard) => {
    const shardId = shard.id;

    shardLogger.info(`Shard ${shardId} created`);

    shard.on("ready", () => {
      shardLogger.success(`Shard ${shardId} ready`);
    });

    shard.on("disconnect", () => {
      shardLogger.warn(`Shard ${shardId} disconnected`);
    });

    shard.on("reconnecting", () => {
      shardLogger.info(`Shard ${shardId} reconnecting...`);
    });

    shard.on("death", (childProcess) => {
      const pid = "pid" in childProcess ? childProcess.pid : "unknown";
      shardLogger.error(`Shard ${shardId} died (PID: ${pid})`);
    });

    shard.on("error", (error) => {
      shardLogger.error(`Shard ${shardId} error:`, error);
    });

    shard.on("message", (message) => {
      handleShardMessage(shardId, message);
    });
  });
}

/**
 * Handle messages from shards
 */
function handleShardMessage(shardId: number, message: unknown): void {
  // Handle custom IPC messages from shards
  if (typeof message === "object" && message !== null) {
    const msg = message as Record<string, unknown>;

    if (msg.type === "log") {
      shardLogger.info(`[Shard ${shardId}] ${msg.content}`);
    } else if (msg.type === "stats") {
      // Could forward stats to monitoring system
      shardLogger.debug(`[Shard ${shardId}] Stats: ${JSON.stringify(msg.data)}`);
    }
  }
}

/**
 * Start the sharding manager
 */
export async function startShardManager(manager: ShardingManager): Promise<void> {
  const shardingConfig = getShardingConfig();

  shardLogger.info("Starting shard manager...");

  try {
    await manager.spawn({
      timeout: shardingConfig.spawnTimeout,
      delay: 5000, // 5 second delay between shard spawns
    });

    shardLogger.success(`All shards spawned successfully`);
  } catch (error) {
    shardLogger.error("Failed to spawn shards:", error);
    throw error;
  }
}

/**
 * Broadcast a message to all shards
 */
export async function broadcastToShards(
  manager: ShardingManager,
  message: unknown
): Promise<unknown[]> {
  return await manager.broadcast(message);
}

/**
 * Get stats from all shards
 */
export async function getShardStats(manager: ShardingManager): Promise<{
  totalGuilds: number;
  totalMembers: number;
  shardCount: number;
}> {
  const results = await manager.fetchClientValues("guilds.cache.size");
  const memberResults = await manager.fetchClientValues("users.cache.size");

  const totalGuilds = (results as number[]).reduce((acc, count) => acc + count, 0);
  const totalMembers = (memberResults as number[]).reduce((acc, count) => acc + count, 0);

  return {
    totalGuilds,
    totalMembers,
    shardCount: manager.shards.size,
  };
}

