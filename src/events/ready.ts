import type { BotClient } from "../structs/BotClient.ts";
import { botLogger } from "../utils/logger.ts";
import { initializeVoiceCache } from "../services/GoogleTTSService.ts";
import { initializeLoggerService } from "../services/LoggerService.ts";
import { initializeUsageService } from "../services/UsageService.ts";
import { initializeCacheService } from "../services/CacheService.ts";
import { getDatabase } from "../settings/db.ts";
import {
  getPresence,
  initPresenceFromConfig,
} from "../presence/store.ts";

export async function handleReady(client: BotClient): Promise<void> {
  if (!client.user) {
    botLogger.error("Client user is null on ready event");
    return;
  }
  initPresenceFromConfig(client.config);
  client.initialized = true;
  const shardInfo = client.getShardInfo();
  const guildCount = client.guilds.cache.size;
  botLogger.info(`${shardInfo} Ready | ${guildCount} guilds`);
  await initializeServices();
  initializeVoiceCache().catch((error) => {
    botLogger.warn("Failed to initialize voice cache:", error);
  });
  updatePresence(client);
  setInterval(
    () => {
      updatePresence(client);
    },
    15 * 60 * 1000,
  );
}

/**
 * Initialize all core services:
 * - LoggerService: Activity logging to separate DB
 * - UsageService: Quota tracking in main DB
 * - CacheService: Audio file caching
 */
async function initializeServices(): Promise<void> {
  try {
    // Initialize Logger Service (separate logs.sqlite)
    await initializeLoggerService();
    botLogger.info("LoggerService initialized");
  } catch (error) {
    botLogger.warn("Failed to initialize LoggerService:", error);
  }

  try {
    // Initialize Usage Service (main DB)
    const db = getDatabase();
    initializeUsageService(db);
    botLogger.info("UsageService initialized");
  } catch (error) {
    botLogger.warn("Failed to initialize UsageService:", error);
  }

  try {
    // Initialize Cache Service (file system)
    await initializeCacheService();
    botLogger.info("CacheService initialized");
  } catch (error) {
    botLogger.warn("Failed to initialize CacheService:", error);
  }
}

function updatePresence(client: BotClient): void {
  if (!client.user) return;
  const presence = getPresence();
  if (!presence) return;
  client.user.setPresence(presence);
}
