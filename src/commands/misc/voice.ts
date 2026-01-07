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
import { t, DEFAULT_LOCALE } from "../../i18n/index.ts";
import {
  getLocale,
  isPremiumUser,
  getUserTTSProfile,
  getPremiumStatus,
  setUserTTSProfile,
} from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";
import {
  SUPPORTED_LANGUAGES,
  getSupportedLanguageByCode,
} from "../../constants/languages.ts";

// Language flag emojis
const LANGUAGE_FLAGS: Record<string, string> = {
  // Priority languages
  vi: "🇻🇳",
  en: "🇺🇸",
  ja: "🇯🇵",
  ko: "🇰🇷",
  "zh-CN": "🇨🇳",
  // Alphabetical (A-I)
  af: "🇿🇦",
  ar: "🇸🇦",
  hy: "🇦🇲",
  bn: "🇧🇩",
  ca: "🇪🇸",
  hr: "🇭🇷",
  cs: "🇨🇿",
  da: "🇩🇰",
  nl: "🇳🇱",
  tl: "🇵🇭",
  fi: "🇫🇮",
  fr: "🇫🇷",
  de: "🇩🇪",
  el: "🇬🇷",
  hi: "🇮🇳",
  hu: "🇭🇺",
  is: "🇮🇸",
  id: "🇮🇩",
  it: "🇮🇹",
  // Alphabetical (J-Z)
  jw: "🇮🇩",
  km: "🇰🇭",
  lv: "🇱🇻",
  ml: "🇮🇳",
  mr: "🇮🇳",
  ne: "🇳🇵",
  no: "🇳🇴",
  pl: "🇵🇱",
  pt: "🇧🇷",
  ro: "🇷🇴",
  ru: "🇷🇺",
  sr: "🇷🇸",
  si: "🇱🇰",
  sk: "🇸🇰",
  es: "🇪🇸",
  su: "🇮🇩",
  sw: "🇹🇿",
  sv: "🇸🇪",
  ta: "🇮🇳",
  te: "🇮🇳",
  th: "🇹🇭",
  tr: "🇹🇷",
  uk: "🇺🇦",
};

/**
 * Get flag emoji for a language code
 */
export function getLanguageFlag(code: string): string {
  const shortCode = code.includes("-") ? code.split("-")[0] : code;
  return LANGUAGE_FLAGS[shortCode || ""] || "🌐";
}

/**
 * Auto-downgrade check: Reconcile premium settings with subscription status
 * If user has premium settings but no active subscription, silently downgrade to basic
 */
export function reconcilePremiumSettings(userId: string): void {
  const isUserPremium = isPremiumUser(userId);
  const profile = getUserTTSProfile(userId);

  if (!isUserPremium && profile.provider === "premium") {
    // DETECTED INVALID STATE - user has premium settings but no subscription
    // Silently downgrade to basic
    setUserTTSProfile(userId, {
      provider: "basic",
      voiceId: null,
    });
  }
}

/**
 * Build the voice dashboard embed
 */
export function buildVoiceDashboardEmbed(
  userId: string,
  locale: string,
): EmbedBuilder {
  // Auto-downgrade check before rendering
  reconcilePremiumSettings(userId);

  const ttsProfile = getUserTTSProfile(userId);
  const premiumStatus = getPremiumStatus(userId);

  // Get language display name
  const langCode = ttsProfile.language || "vi";
  const langInfo = getSupportedLanguageByCode(langCode);
  const langFlag = getLanguageFlag(langCode);
  const langDisplay = langInfo
    ? `${langFlag} ${langInfo.name} (${langInfo.nativeName})`
    : `${langFlag} ${langCode}`;

  // Get provider display
  const providerDisplay =
    ttsProfile.provider === "premium"
      ? t(locale, "commands.voice.dashboard.providerPremium")
      : t(locale, "commands.voice.dashboard.providerBasic");

  // Get voice model display
  let modelDisplay = t(locale, "commands.voice.dashboard.modelDefault");
  if (ttsProfile.provider === "premium" && ttsProfile.voiceId) {
    // Extract variant letter from voice ID (e.g., "vi-VN-Wavenet-A" -> "Wavenet A")
    const parts = ttsProfile.voiceId.split("-");
    const variant = parts[parts.length - 1];
    modelDisplay = `Wavenet ${variant}`;
  }

  // Get status display
  const statusDisplay = premiumStatus.isPremium
    ? premiumStatus.isLifetime
      ? t(locale, "commands.voice.dashboard.statusLifetime")
      : t(locale, "commands.voice.dashboard.statusActive")
    : t(locale, "commands.voice.dashboard.statusFree");

  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voice.dashboard.title"))
    .setDescription(t(locale, "commands.voice.dashboard.subtitle"))
    .setColor(premiumStatus.isPremium ? Colors.Success : Colors.Primary)
    .addFields(
      {
        name: t(locale, "commands.voice.dashboard.language"),
        value: langDisplay,
        inline: true,
      },
      {
        name: t(locale, "commands.voice.dashboard.provider"),
        value: providerDisplay,
        inline: true,
      },
      {
        name: t(locale, "commands.voice.dashboard.model"),
        value: modelDisplay,
        inline: true,
      },
      {
        name: t(locale, "commands.voice.dashboard.status"),
        value: statusDisplay,
        inline: false,
      },
    );

  // Add premium hint for free users
  if (!premiumStatus.isPremium) {
    embed.setFooter({
      text: t(locale, "commands.voice.dashboard.upgradeHint"),
    });
  }

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
      .setStyle(ButtonStyle.Primary)
      .setEmoji("⚙️"),
    new ButtonBuilder()
      .setCustomId("btn_voice_reset")
      .setLabel(t(locale, "commands.voice.buttons.reset"))
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔄"),
  );
}

export const voice: Command = {
  data: new SlashCommandBuilder()
    .setName("voice")
    .setDescription(t(DEFAULT_LOCALE, "commands.voice.description")),

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
