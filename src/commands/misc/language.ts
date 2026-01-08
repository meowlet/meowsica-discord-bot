/**
 * Language Settings Dashboard Command
 *
 * Displays a dashboard with current UI language settings
 * and interactive controls for configuration.
 * Supports both User and Server (Admin) settings.
 */

import {
  EmbedBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "../../types/command.ts";
import { t, SUPPORTED_LOCALES, type Locale } from "../../i18n/index.ts";
import {
  getLocale,
  getUserLocale,
  getServerLocale,
} from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";

/**
 * Get display name for a locale
 */
export function getLocaleDisplay(locale: Locale | null): { flag: string; name: string } {
  switch (locale) {
    case "en":
      return { flag: "🇺🇸", name: "English" };
    case "vi":
      return { flag: "🇻🇳", name: "Tiếng Việt" };
    default:
      return { flag: "🌐", name: "Default" };
  }
}

/**
 * Build the language dashboard embed
 */
export function buildLanguageDashboardEmbed(
  userId: string,
  guildId: string | null,
  locale: string,
): EmbedBuilder {
  const userLocale = getUserLocale(userId);
  const serverLocale = guildId ? getServerLocale(guildId) : null;

  // Get display values
  const userDisplay = getLocaleDisplay(userLocale);
  const serverDisplay = getLocaleDisplay(serverLocale);

  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.language.dashboard.title"))
    .setDescription(t(locale, "commands.language.dashboard.subtitle"))
    .setColor(Colors.Primary)
    .addFields(
      {
        name: t(locale, "commands.language.dashboard.userLanguage"),
        value: userLocale
          ? `${userDisplay.flag} ${userDisplay.name}`
          : t(locale, "commands.language.dashboard.notSet"),
        inline: false,
      },
      {
        name: t(locale, "commands.language.dashboard.serverLanguage"),
        value: serverLocale
          ? `${serverDisplay.flag} ${serverDisplay.name}`
          : t(locale, "commands.language.dashboard.notSet"),
        inline: false,
      },
    )
    .setFooter({
      text: t(locale, "commands.language.dashboard.priorityNote"),
    });

  return embed;
}

/**
 * Build the action buttons for the dashboard
 */
export function buildLanguageDashboardButtons(locale: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_language_config")
      .setLabel(t(locale, "commands.language.buttons.configure"))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("btn_language_close")
      .setLabel(t(locale, "commands.language.buttons.close"))
      .setStyle(ButtonStyle.Secondary),
  );
}

export const language: Command = {
  data: new SlashCommandBuilder()
    .setName("language")
    .setDescription("Manage interface language settings")
    .setDescriptionLocalizations({
      vi: "Quản lý cài đặt ngôn ngữ giao diện",
    }),

  async execute(interaction) {
    const locale = getLocale(interaction);
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const embed = buildLanguageDashboardEmbed(userId, guildId, locale);
    const buttons = buildLanguageDashboardButtons(locale);

    await interaction.reply({
      embeds: [embed],
      components: [buttons],
    });
  },
};
