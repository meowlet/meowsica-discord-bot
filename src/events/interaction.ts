/**
 * Interaction Event Handler
 *
 * Handles Discord interactions (slash commands, autocomplete, etc.)
 */

import {
  type Interaction,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  MessageFlags,
} from "discord.js";
import type { BotClient } from "../structs/BotClient.ts";
import { commands } from "../commands/index.ts";
import { commandLogger } from "../utils/logger.ts";

/** Command map for fast lookup */
const commandMap = new Map(commands.map((cmd) => [cmd.data.name, cmd]));

export async function handleInteraction(
  client: BotClient,
  interaction: Interaction
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    await handleCommand(client, interaction);
  } else if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
  }
}

async function handleCommand(
  client: BotClient,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const command = commandMap.get(interaction.commandName);

  if (!command) {
    commandLogger.warn(`Command not found: ${interaction.commandName}`);
    await interaction.reply({
      content: "Unknown command!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const shardInfo = client.getShardInfo();
    commandLogger.info(
      `${shardInfo} /${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild?.name ?? "DM"}`
    );

    await command.execute(interaction);
  } catch (error) {
    commandLogger.error(`Error executing /${interaction.commandName}:`, error);

    const errorMessage = "There was an error executing this command!";

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: errorMessage,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: errorMessage,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const command = commandMap.get(interaction.commandName);

  if (!command || !command.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    commandLogger.error(`Error in autocomplete for /${interaction.commandName}:`, error);
  }
}

