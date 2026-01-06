





import type { Guild } from "discord.js";
import type { BotClient } from "../structs/BotClient.ts";
import { RedisService } from "../services/RedisService.ts";
import { botLogger } from "../utils/logger.ts";




export async function handleGuildCreate(client: BotClient, guild: Guild): Promise<void> {
  const shardInfo = client.getShardInfo();
  botLogger.info(`${shardInfo} Joined guild: ${guild.name} (${guild.id})`);
  botLogger.info(`${shardInfo} Now serving ${client.guilds.cache.size} guilds`);
}




export async function handleGuildDelete(client: BotClient, guild: Guild): Promise<void> {
  const shardInfo = client.getShardInfo();
  botLogger.info(`${shardInfo} Left guild: ${guild.name} (${guild.id})`);
  botLogger.info(`${shardInfo} Now serving ${client.guilds.cache.size} guilds`);

  
  if (client.config.enableRedis && RedisService.isConnected()) {
    try {
      await RedisService.clearGuildSettings(guild.id);
      botLogger.debug(`${shardInfo} Cleaned up Redis data for guild ${guild.id}`);
    } catch (error) {
      botLogger.error(`${shardInfo} Failed to clean up Redis data for guild ${guild.id}:`, error);
    }
  }
}

