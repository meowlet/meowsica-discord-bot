import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/command.ts";
import { t, DEFAULT_LOCALE } from "../i18n/index.ts";
import { getLocale } from "../settings/index.ts";

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription(t(DEFAULT_LOCALE, "commands.ping.description")),

  async execute(interaction) {
    const locale = getLocale(interaction);

    const response = await interaction.reply({
      content: t(locale, "commands.ping.pinging"),
      withResponse: true,
    });

    const message = response.resource?.message;
    const latency = message
      ? message.createdTimestamp - interaction.createdTimestamp
      : 0;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.ping.title"))
      .setDescription(t(locale, "commands.ping.subtitle"))
      .addFields(
        {
          name: t(locale, "commands.ping.latency"),
          value: `\`${latency}ms\``,
          inline: true,
        },
        {
          name: t(locale, "commands.ping.apiLatency"),
          value: `\`${apiLatency}ms\``,
          inline: true,
        }
      )
      .setColor(0x5865f2);

    await interaction.editReply({
      content: "",
      embeds: [embed],
    });
  },
};
