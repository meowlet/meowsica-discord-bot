import type { Guild } from "discord.js";
import type { BotClient } from "../structs/BotClient.ts";
import { RedisService } from "../services/RedisService.ts";
import { botLogger } from "../utils/logger.ts";
import { leaveChannel } from "../voice/manager.ts";

export async function handleGuildCreate(
  client: BotClient,
  guild: Guild,
): Promise<void> {
  // Guild join handled silently
}

export async function handleGuildDelete(
  client: BotClient,
  guild: Guild,
): Promise<void> {
  leaveChannel(guild.id);
  if (client.config.enableRedis && RedisService.isConnected()) {
    try {
      await RedisService.clearGuildSettings(guild.id);
    } catch (error) {
      botLogger.error(
        `Failed to clean up Redis data for guild ${guild.id}:`,
        error,
      );
    }
  }
}
