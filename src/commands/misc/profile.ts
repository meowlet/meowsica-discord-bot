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
  isPremiumUser,
  getUserTTSProfile,
  getPremiumStatus,
} from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";
import { ICONS } from "../../constants/icons.ts";
import { reconcilePremiumSettings } from "./voice.ts";
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

    // Auto-downgrade check: reconcile premium settings with subscription status
    reconcilePremiumSettings(userId);

    // Fetch user data
    const isEncore = isPremiumUser(userId);
    const ttsProfile = getUserTTSProfile(userId);
    const premiumStatus = getPremiumStatus(userId);

    // Determine Status Text
    let statusText: string;
    if (premiumStatus.isFreeTrial) {
      statusText = t(locale, "commands.profile.status.freeTrial");
    } else if (isEncore) {
      statusText = `${t(locale, "commands.profile.status.encore")} ${ICONS.ENCORE}`;
    } else {
      statusText = t(locale, "commands.profile.status.free");
    }

    // Determine Provider Text
    const providerText =
      ttsProfile.provider === "premium"
        ? "Encore"
        : "Basic";

    // Determine Model Text
    let modelText = t(locale, "commands.profile.model.auto");
    if (ttsProfile.provider === "premium" && ttsProfile.voiceId) {
      // Show actual model ID (e.g., "vi-VN-Wavenet-A")
      modelText = ttsProfile.voiceId;
    }

    // Determine Expiration Text
    let expiresText: string;
    if (!isEncore) {
      expiresText = "N/A";
    } else if (premiumStatus.isFreeTrial) {
      expiresText = "01/02/2026"; // Free trial end date
    } else if (premiumStatus.isLifetime) {
      expiresText = t(locale, "commands.profile.expires.lifetime");
    } else if (premiumStatus.expiresAt) {
      // Format as DD/MM/YYYY
      const date = premiumStatus.expiresAt;
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      expiresText = `${day}/${month}/${year}`;
    } else {
      expiresText = "N/A";
    }

    // Build Embed (Clean, No field icons)
    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.profile.title"))
      .setColor(isEncore ? Colors.Encore : Colors.Blurple)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        {
          name: t(locale, "commands.profile.fields.status"),
          value: statusText,
          inline: false,
        },
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
        {
          name: t(locale, "commands.profile.fields.expires"),
          value: expiresText,
          inline: false,
        },
      );

    // Add Usage field for Encore users
    if (isEncore) {
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
    } else {
      embed.addFields({
        name: t(locale, "commands.profile.fields.usage"),
        value: t(locale, "commands.profile.usage.notApplicable"),
        inline: false,
      });
    }

    // Add hint for free trial users
    if (premiumStatus.isFreeTrial) {
      embed.setFooter({ text: t(locale, "commands.profile.freeTrialHint") });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
