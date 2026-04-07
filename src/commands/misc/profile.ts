/**
 * Profile Command
 *
 * Displays a minimalist user profile showing TTS settings and Encore status.
 * Design: Color-coded (Gold for Encore, Blurple for Free), no generic icons.
 * Includes Monthly Encore Usage with progress bar.
 */

import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/command.ts";
import { t } from "../../i18n/index.ts";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import {
  getLocale,
  getUserTTSProfile,
} from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";
import { getUsageService } from "../../services/UsageService.ts";

export const profile: Command = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription(en.commands.profile.description)
    .setDescriptionLocalizations({
      vi: vi.commands.profile.description,
    }),

  async execute(interaction) {
    const locale = getLocale(interaction);
    const userId = interaction.user.id;

    const ttsProfile = getUserTTSProfile(userId);

    const providerText =
      ttsProfile.provider === "premium"
        ? "Encore"
        : "Basic";

    let modelText = t(locale, "commands.profile.model.auto");
    if (ttsProfile.provider === "premium" && ttsProfile.voiceId) {
      modelText = ttsProfile.voiceId;
    }

    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.profile.title"))
      .setColor(Colors.Encore)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        {
          name: t(locale, "commands.profile.fields.provider"),
          value: providerText,
          inline: false,
        },
        {
          name: t(locale, "commands.profile.fields.model"),
          value: modelText,
          inline: false,
        },
      );

    try {
      const usageService = getUsageService();
      const usageText = usageService.getFormattedUsage(userId);
      embed.addFields({
        name: t(locale, "commands.profile.fields.usage"),
        value: usageText,
        inline: false,
      });
    } catch {
      // UsageService not initialized yet - skip usage field
    }

    await interaction.reply({ embeds: [embed] });
  },
};
