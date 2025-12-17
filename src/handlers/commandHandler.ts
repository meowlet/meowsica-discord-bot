import type { ChatInputCommandInteraction } from "discord.js";
import { commands } from "../commands/index.ts";
import { commandLogger } from "../utils/logger.ts";

const commandMap = new Map(commands.map((cmd) => [cmd.data.name, cmd]));

export async function handleCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const command = commandMap.get(interaction.commandName);

  if (!command) {
    commandLogger.warn(`Command not found: ${interaction.commandName}`);
    await interaction.reply({
      content: "Unknown command!",
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    commandLogger.error(`Error executing /${interaction.commandName}:`, error);

    const errorMessage = "There was an error executing this command!";

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
