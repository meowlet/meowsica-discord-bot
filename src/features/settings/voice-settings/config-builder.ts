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
}

export function getLanguagePage(languageCode: string | null): number {
  if (!languageCode) return 1;
  const index = SUPPORTED_LANGUAGES.findIndex(
    (lang) =>
      lang.code === languageCode ||
      lang.cloudCode === languageCode ||
      languageCode.startsWith(lang.code),
  );
  if (index === -1) return 1;
  return Math.floor(index / LANGUAGES_PER_PAGE) + 1;
}

function buildLanguageSelect(
  current: string | null,
  locale: Locale,
  page: number,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const total = SUPPORTED_LANGUAGES.length;
  const totalPages = Math.ceil(total / LANGUAGES_PER_PAGE);
  const start = (page - 1) * LANGUAGES_PER_PAGE;
  const end = Math.min(start + LANGUAGES_PER_PAGE, total);
  const slice = SUPPORTED_LANGUAGES.slice(start, end);
  const currentCode = current ?? DEFAULT_LANGUAGE_CODE;
  const options = slice.map((lang) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(lang.name)
      .setDescription(lang.nativeName)
      .setValue(lang.cloudCode)
      .setEmoji(lang.flag)
      .setDefault(
        lang.code === currentCode ||
          lang.cloudCode === currentCode ||
          currentCode.startsWith(lang.code),
      ),
  );
  if (page < totalPages) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(t(locale, "commands.voice.config.moreLanguages"))
        .setDescription(t(locale, "commands.voice.config.moreLanguagesDesc"))
        .setValue(NAV_NEXT),
    );
  }
  if (page > 1) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(t(locale, "commands.voice.config.backToTop"))
        .setDescription(t(locale, "commands.voice.config.backToTopDesc"))
        .setValue(NAV_PREV),
    );
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId(VOICE_CUSTOM_IDS.languageSelect)
    .setPlaceholder(t(locale, "commands.voice.config.languagePlaceholder"))
    .addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildProviderSelect(
  current: TtsProvider,
  supportsWavenet: boolean,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options: StringSelectMenuOptionBuilder[] = [
    new StringSelectMenuOptionBuilder()
      .setLabel(t(locale, "commands.voice.config.providerBasicLabel"))
      .setDescription(t(locale, "commands.voice.config.providerBasicDesc"))
      .setValue("basic")
      .setDefault(current === "basic" || !supportsWavenet),
  ];
  if (supportsWavenet) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(t(locale, "commands.voice.config.providerWavenetLabel"))
        .setDescription(t(locale, "commands.voice.config.providerWavenetDesc"))
        .setValue("wavenet")
        .setDefault(current === "wavenet"),
    );
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId(VOICE_CUSTOM_IDS.providerSelect)
    .setPlaceholder(
      supportsWavenet
        ? t(locale, "commands.voice.config.providerPlaceholder")
        : t(locale, "commands.voice.config.providerBasicOnly"),
    )
    .addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildVariantSelect(
  voices: readonly { value: string; gender: string }[],
  currentVoice: string | null,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  let options: StringSelectMenuOptionBuilder[] = [];
  if (voices.length > 0) {
    options = voices.slice(0, 25).map((voice) => {
