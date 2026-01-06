import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { commands } from "../commands.ts";
import { commandLogger } from "../utils/logger.ts";

const commandMap = new Map(commands.map((cmd) => [cmd.data.name, cmd]));

export async function handleCommand(
  interaction: ChatInputCommandInteraction,
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

export async function handleAutocomplete(
  interaction: AutocompleteInteraction,
): Promise<void> {
  const command = commandMap.get(interaction.commandName);

  if (!command || !command.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    commandLogger.error(
      `Error in autocomplete for /${interaction.commandName}:`,
      error,
    );
  }
}
