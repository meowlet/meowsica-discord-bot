import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/command.ts";
import { commands } from "./index.ts";

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows all available commands"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Available Commands")
      .setColor(0x5865f2)
      .setDescription("Here are all the commands you can use:")
      .addFields(
        commands.map((cmd) => ({
          name: `/${cmd.data.name}`,
          value: cmd.data.description,
          inline: true,
        }))
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
