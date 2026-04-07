/**
 * Voice Settings Dashboard Command
 *
 * Displays a personal "Sound Dashboard" with current TTS settings
 * and interactive controls for configuration.
 */

import {
  EmbedBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import type { Command } from "../../types/command.ts";
import { t } from "../../i18n/index.ts";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import {
  getLocale,
  getUserTTSProfile,
} from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";
import {
  SUPPORTED_LANGUAGES,
  getSupportedLanguageByCode,
} from "../../constants/languages.ts";

/**
 * Get flag emoji for a language code
 * Uses the flag property from SUPPORTED_LANGUAGES
 */
export function getLanguageFlag(code: string): string {
  const lang = getSupportedLanguageByCode(code);
  return lang?.flag || "🌐";
}

/**
 * Build the voice dashboard embed
 */
export function buildVoiceDashboardEmbed(
  userId: string,
  locale: string,
): EmbedBuilder {
  const ttsProfile = getUserTTSProfile(userId);

  const langCode = ttsProfile.language || "vi";
  const langInfo = getSupportedLanguageByCode(langCode);
  const langFlag = getLanguageFlag(langCode);
  const langDisplay = langInfo
    ? `${langFlag} ${langInfo.name} (${langInfo.nativeName})`
    : `${langFlag} ${langCode}`;

  const providerDisplay =
    ttsProfile.provider === "premium"
      ? t(locale, "commands.voice.dashboard.providerEncore")
      : t(locale, "commands.voice.dashboard.providerBasic");

  let modelDisplay = t(locale, "commands.voice.dashboard.modelDefault");
  if (ttsProfile.provider === "premium" && ttsProfile.voiceId) {
    const parts = ttsProfile.voiceId.split("-");
    const variant = parts[parts.length - 1];
    modelDisplay = `Wavenet ${variant}`;
  }

  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voice.dashboard.title"))
    .setDescription(t(locale, "commands.voice.dashboard.subtitle"))
    .setColor(Colors.Success)
    .addFields(
      {
        name: t(locale, "commands.voice.dashboard.language"),
        value: langDisplay,
        inline: false,
      },
      {
        name: t(locale, "commands.voice.dashboard.provider"),
        value: providerDisplay,
        inline: false,
      },
      {
        name: t(locale, "commands.voice.dashboard.model"),
        value: modelDisplay,
        inline: false,
      },
    );

  return embed;
}

/**
 * Build the action buttons for the dashboard
 */
export function buildDashboardButtons(locale: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_voice_config")
      .setLabel(t(locale, "commands.voice.buttons.config"))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("btn_voice_reset")
      .setLabel(t(locale, "commands.voice.buttons.reset"))
      .setStyle(ButtonStyle.Danger),
  );
}

export const voice: Command = {
  data: new SlashCommandBuilder()
    .setName("voice")
    .setDescription(en.commands.voice.description)
    .setDescriptionLocalizations({
      vi: vi.commands.voice.description,
    }),

  async execute(interaction) {
    const locale = getLocale(interaction);
    const userId = interaction.user.id;

    const embed = buildVoiceDashboardEmbed(userId, locale);
    const buttons = buildDashboardButtons(locale);

    await interaction.reply({
      embeds: [embed],
      components: [buttons],
    });
  },
};
