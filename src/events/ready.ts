import type { BotClient } from "../structs/BotClient.ts";
import { botLogger } from "../utils/logger.ts";
import { initializeVoiceCache } from "../services/GoogleTTSService.ts";

export async function handleReady(client: BotClient): Promise<void> {
  if (!client.user) {
    botLogger.error("Client user is null on ready event");
    return;
  }
  client.initialized = true;
  const shardInfo = client.getShardInfo();
  const guildCount = client.guilds.cache.size;
  botLogger.info(`${shardInfo} Ready | ${guildCount} guilds`);
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

function updatePresence(client: BotClient): void {
  if (!client.user) return;

  const guildCount = client.guilds.cache.size;
  const shardInfo = client.isSharded() ? ` | Shard ${client.shardId}` : "";

  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: `/help | ${guildCount} servers${shardInfo}`,
        type: 3,
      },
    ],
  });
}
