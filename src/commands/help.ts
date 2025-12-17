import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/command.ts";
import { commands } from "./index.ts";
import { t, DEFAULT_LOCALE } from "../i18n/index.ts";
import { getLocale } from "../settings/index.ts";

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription(t(DEFAULT_LOCALE, "commands.help.description")),

  async execute(interaction) {
    const locale = getLocale(interaction);

    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.help.title"))
      .setColor(0x5865f2)
      .setDescription(t(locale, "commands.help.subtitle"))
      .addFields(
        commands.map((cmd) => ({
          name: `/${cmd.data.name}`,
          value: t(locale, `commands.${cmd.data.name}.description`),
          inline: true,
        }))
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
