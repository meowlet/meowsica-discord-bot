/**
 * Ready Event Handler
 *
 * Handles the bot ready event after successful Discord login.
 */

import type { BotClient } from "../structs/BotClient.ts";
import { botLogger } from "../utils/logger.ts";

export async function handleReady(client: BotClient): Promise<void> {
  if (!client.user) {
    botLogger.error("Client user is null on ready event");
    return;
  }

  client.initialized = true;

  const shardInfo = client.getShardInfo();
  const guildCount = client.guilds.cache.size;
  const userTag = client.user.tag;

  botLogger.box(`${shardInfo} Logged in as ${userTag}`);
  botLogger.info(`${shardInfo} Serving ${guildCount} guilds`);

  // Set bot presence
  updatePresence(client);

  // Refresh presence periodically (every 15 minutes)
  setInterval(() => {
    updatePresence(client);
  }, 15 * 60 * 1000);
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
        type: 3, // Watching
      },
    ],
  });
}

