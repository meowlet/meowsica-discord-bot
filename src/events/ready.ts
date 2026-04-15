import type { BotClient } from "../structs/BotClient.ts";
import { botLogger } from "../utils/logger.ts";
import { initializeVoiceCache } from "../services/GoogleTTSService.ts";
import { initializeLoggerService } from "../services/LoggerService.ts";
import { initializeUsageService } from "../services/UsageService.ts";
import { initializeCacheService, getCacheService } from "../services/CacheService.ts";
import { getDatabase } from "../settings/db.ts";
import {
  getPresence,
  initPresenceFromConfig,
} from "../presence/store.ts";
import { cleanupIdlePlayers, getActiveGuildCount } from "../tts/player.ts";

const PRESENCE_INTERVAL_MS = 15 * 60 * 1000;
const HOUSEKEEPING_INTERVAL_MS = 30 * 60 * 1000;

let presenceTimer: ReturnType<typeof setInterval> | null = null;
let housekeepingTimer: ReturnType<typeof setInterval> | null = null;

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
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = setInterval(() => {
    updatePresence(client);
  }, PRESENCE_INTERVAL_MS);
  if (housekeepingTimer) clearInterval(housekeepingTimer);
  housekeepingTimer = setInterval(() => {
    runHousekeeping();
  }, HOUSEKEEPING_INTERVAL_MS);
}

async function initializeServices(): Promise<void> {
  try {
    await initializeLoggerService();
    botLogger.info("LoggerService initialized");
  } catch (error) {
    botLogger.warn("Failed to initialize LoggerService:", error);
  }
  try {
    const db = getDatabase();
    initializeUsageService(db);
    botLogger.info("UsageService initialized");
  } catch (error) {
    botLogger.warn("Failed to initialize UsageService:", error);
  }
  try {
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

async function runHousekeeping(): Promise<void> {
  try {
    const idleCleaned = cleanupIdlePlayers();
    const activeGuilds = getActiveGuildCount();
    if (idleCleaned > 0) {
      botLogger.info(`Housekeeping: cleaned ${idleCleaned} idle players, ${activeGuilds} active`);
    }
    try {
      const cacheService = getCacheService();
      const [, stats] = await Promise.all([
        cacheService.cleanup(),
        cacheService.getStats(),
      ]);
      botLogger.info("Cache stats", {
        totalFiles: stats.totalFiles,
        totalSizeMB: stats.totalSizeMB,
      });
    } catch {
      // CacheService may not be initialized
    }
  } catch (error) {
    botLogger.warn("Housekeeping error:", error);
  }
}
