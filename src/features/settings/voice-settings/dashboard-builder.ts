import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { t, type Locale } from "../../../i18n/translate.ts";
import { Colors } from "../../../shared/colors.ts";
import { findLanguageByCode, getLanguageFlag } from "../../tts/languages.ts";
import type { UserPreferences } from "../user-prefs-repo.ts";
import { VOICE_CUSTOM_IDS } from "./custom-ids.ts";

export function buildVoiceDashboardEmbed(
  prefs: UserPreferences,
  locale: Locale,
): EmbedBuilder {
  const langCode = prefs.tts.language ?? "vi";
  const langInfo = findLanguageByCode(langCode);
  const langFlag = getLanguageFlag(langCode);
  const langDisplay = langInfo
    ? `${langFlag} ${langInfo.name} (${langInfo.nativeName})`
    : `${langFlag} ${langCode}`;
  const providerDisplay =
    prefs.tts.provider === "wavenet"
      ? t(locale, "commands.voice.dashboard.providerWavenet")
      : t(locale, "commands.voice.dashboard.providerBasic");
  let modelDisplay = t(locale, "commands.voice.dashboard.modelDefault");
  if (prefs.tts.provider === "wavenet" && prefs.tts.voiceId) {
    const variant = prefs.tts.voiceId.split("-").pop() ?? "";
    modelDisplay = `Wavenet ${variant}`;
  }
  return new EmbedBuilder()
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
}

export function buildVoiceDashboardButtons(
  locale: Locale,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(VOICE_CUSTOM_IDS.configButton)
      .setLabel(t(locale, "commands.voice.buttons.config"))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(VOICE_CUSTOM_IDS.resetButton)
      .setLabel(t(locale, "commands.voice.buttons.reset"))
      .setStyle(ButtonStyle.Danger),
  );
}
