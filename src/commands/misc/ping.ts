import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/command.ts";
import { t, DEFAULT_LOCALE } from "../../i18n/index.ts";
import { getLocale } from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";

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
          inline: false,
        },
        {
          name: t(locale, "commands.ping.apiLatency"),
          value: `\`${apiLatency}ms\``,
          inline: false,
        },
      )
      .setColor(Colors.Primary);

    await interaction.editReply({
      content: "",
      embeds: [embed],
    });
  },
};
