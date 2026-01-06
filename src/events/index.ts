import { Events } from "discord.js";
import type { BotClient } from "../structs/BotClient.ts";
import { handleReady } from "./ready.ts";
import { handleInteraction } from "./interaction.ts";
import { handleGuildCreate, handleGuildDelete } from "./guild.ts";
import { botLogger } from "../utils/logger.ts";

export function registerEvents(client: BotClient): void {
  client.once(Events.ClientReady, () => {
    handleReady(client);
  });

  client.on(Events.InteractionCreate, (interaction) => {
    handleInteraction(client, interaction);
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
}

export { handleReady, handleInteraction, handleGuildCreate, handleGuildDelete };
