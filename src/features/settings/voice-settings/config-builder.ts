import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { t, type Locale } from "../../../i18n/translate.ts";
import { Colors } from "../../../shared/colors.ts";
import {
  DEFAULT_LANGUAGE_CLOUD,
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGES,
} from "../../tts/languages.ts";
import type { WavenetVoiceCatalog } from "../../tts/voice-catalog.ts";
import type { UserPreferences } from "../user-prefs-repo.ts";
import type { TtsProvider } from "../../tts/types.ts";
import {
  LANGUAGES_PER_PAGE,
  NAV_NEXT,
  NAV_PREV,
  VOICE_CUSTOM_IDS,
} from "./custom-ids.ts";
import {
  BASIC_SPEED_OPTIONS,
  PITCH_OPTIONS,
  WAVENET_SPEED_OPTIONS,
} from "./option-tables.ts";

export interface ConfigState {
  readonly languagePage?: number;
}

export interface ConfigInterface {
  readonly embed: EmbedBuilder;
  readonly rows: ActionRowBuilder<StringSelectMenuBuilder>[];
}

export interface BuildConfigParams {
  readonly prefs: UserPreferences;
  readonly locale: Locale;
  readonly voiceCatalog: WavenetVoiceCatalog;
  readonly state?: ConfigState;
}

export async function buildVoiceConfigInterface(
  params: BuildConfigParams,
): Promise<ConfigInterface> {
  const { prefs, locale, voiceCatalog, state = {} } = params;
  const langCode = prefs.tts.language ?? DEFAULT_LANGUAGE_CLOUD;
  const wavenetVoices = await voiceCatalog.getVoicesForLanguage(langCode);
  const supportsWavenet = wavenetVoices.length > 0;
  const effectiveProvider: TtsProvider = supportsWavenet
    ? prefs.tts.provider
    : "basic";
  const isWavenetMode = effectiveProvider === "wavenet" && supportsWavenet;
  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voice.config.title"))
    .setDescription(t(locale, "commands.voice.config.subtitle"))
    .setColor(Colors.Primary);
  if (!supportsWavenet) {
    embed.setFooter({
      text: t(locale, "commands.voice.config.noWavenetForLanguage"),
    });
  }
  const languagePage =
    state.languagePage ?? getLanguagePage(prefs.tts.language);
  const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [
    buildLanguageSelect(prefs.tts.language, locale, languagePage),
    buildProviderSelect(effectiveProvider, supportsWavenet, locale),
  ];
  if (isWavenetMode) {
    rows.push(
      buildVariantSelect(wavenetVoices, prefs.tts.voiceId, locale),
    );
  }
  rows.push(buildSpeedSelect(prefs.tts.speed, isWavenetMode, locale));
  if (isWavenetMode) {
    rows.push(buildPitchSelect(prefs.tts.pitch, locale));
  }
  return { embed, rows };
