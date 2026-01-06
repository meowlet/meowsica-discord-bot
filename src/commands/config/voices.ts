import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/command.ts";
import { t, DEFAULT_LOCALE } from "../../i18n/index.ts";
import { getLocale } from "../../settings/index.ts";
import { Colors } from "../../constants/index.ts";
import { getSortedVoiceLanguages } from "../../tts/index.ts";

const LANGUAGES_PER_PAGE = 15;

export const voices: Command = {
  data: new SlashCommandBuilder()
    .setName("voices")
    .setDescription(t(DEFAULT_LOCALE, "commands.voices.description"))
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setDescription("Page number")
        .setRequired(false)
        .setMinValue(1),
    ),

  async execute(interaction) {
    const locale = getLocale(interaction);
    const requestedPage = interaction.options.getInteger("page") ?? 1;

    const languages = getSortedVoiceLanguages();
    const totalPages = Math.ceil(languages.length / LANGUAGES_PER_PAGE);
    const page = Math.min(Math.max(1, requestedPage), totalPages);

    const startIndex = (page - 1) * LANGUAGES_PER_PAGE;
    const endIndex = Math.min(
      startIndex + LANGUAGES_PER_PAGE,
      languages.length,
    );
    const pageLanguages = languages.slice(startIndex, endIndex);

    const languageList = pageLanguages
      .map((lang) => `${lang.emoji} **${lang.name}** \`${lang.code}\``)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.voices.title"))
      .setDescription(t(locale, "commands.voices.subtitle"))
      .setColor(Colors.Primary)
      .addFields(
        {
          name: t(locale, "commands.voices.pageInfo", {
            current: page.toString(),
            total: totalPages.toString(),
          }),
          value: languageList,
          inline: false,
        },
        {
          name: "\u200b",
          value: t(locale, "commands.voices.usage"),
          inline: false,
        },
      )
      .setFooter({
        text: t(locale, "commands.voices.totalLanguages", {
          count: languages.length.toString(),
        }),
      });

    await interaction.reply({ embeds: [embed] });
  },
};
