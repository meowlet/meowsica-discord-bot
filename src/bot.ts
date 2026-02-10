import { Events } from "discord.js";
import { BotClient } from "./structs/BotClient.ts";
import { getConfig } from "./config/index.ts";
import { botLogger } from "./utils/logger.ts";
import { handleReady } from "./events/ready.ts";
import { handleInteraction } from "./events/interaction.ts";
import { handleGuildCreate, handleGuildDelete } from "./events/guild.ts";

export function createBot(): BotClient {
  const config = getConfig();
  const client = new BotClient({ config });

  client.once(Events.ClientReady, () => {
    handleReady(client);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      await handleInteraction(client, interaction);
    } catch (error) {
      botLogger.error("Unhandled interaction error:", error);
    }
  });

  client.on(Events.GuildCreate, (guild) => {
    handleGuildCreate(client, guild);
  });

  client.on(Events.GuildDelete, (guild) => {
    handleGuildDelete(client, guild);
  });

  client.on(Events.Error, (error) => {
    botLogger.error("Discord client error:", error);
  });

  client.on(Events.Warn, (message) => {
    botLogger.warn("Discord client warning:", message);
  });

  return client;
}

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

if (import.meta.main) {
  const client = await startBot();

  // Graceful shutdown handler - ensures bot disconnects when process is killed
  const shutdown = async (signal: string) => {
    botLogger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      client.destroy();
      botLogger.info("Bot disconnected from Discord");
    } catch (error) {
      botLogger.error("Error during shutdown:", error);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGHUP", () => shutdown("SIGHUP"));
}

export { BotClient };
