import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/command.ts";

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong and shows latency"),

  async execute(interaction) {
    const response = await interaction.reply({
      content: "Pinging...",
      withResponse: true,
    });

    const message = response.resource?.message;
    const latency = message
      ? message.createdTimestamp - interaction.createdTimestamp
      : 0;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setTitle("Pong!")
      .setDescription("Your latency and API latency are shown below.")
      .addFields(
        { name: "Latency", value: `\`${latency}ms\``, inline: true },
        { name: "API Latency", value: `\`${apiLatency}ms\``, inline: true }
      )
      .setColor(0x5865f2);

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
