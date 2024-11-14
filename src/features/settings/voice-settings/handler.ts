import {
  MessageFlags,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { t, type Locale } from "../../../i18n/translate.ts";
import type { Logger } from "../../../shared/logger.ts";
import type {
  ComponentHandler,
  ComponentInteraction,
} from "../../../shared/command.ts";
import type { LocaleResolver } from "../locale-resolver.ts";
import type { UserPrefsRepository } from "../user-prefs-repo.ts";
import type { WavenetVoiceCatalog } from "../../tts/voice-catalog.ts";
import type { TtsProvider } from "../../tts/types.ts";
import {
  buildVoiceDashboardButtons,
  buildVoiceDashboardEmbed,
} from "./dashboard-builder.ts";
import {
  buildVoiceConfigInterface,
  type ConfigState,
} from "./config-builder.ts";
import {
  NAV_NEXT,
  NAV_PREV,
  VOICE_CUSTOM_IDS,
  isVoiceComponent,
} from "./custom-ids.ts";
import {
  DEFAULT_LANGUAGE_CLOUD,
  findLanguageByCode,
} from "../../tts/languages.ts";

export interface VoiceSettingsHandlerDeps {
  readonly logger: Logger;
  readonly userPrefs: UserPrefsRepository;
  readonly localeResolver: LocaleResolver;
  readonly voiceCatalog: WavenetVoiceCatalog;
}

export class VoiceSettingsHandler implements ComponentHandler {
  private readonly logger: Logger;
  private readonly userPrefs: UserPrefsRepository;
  private readonly localeResolver: LocaleResolver;
  private readonly voiceCatalog: WavenetVoiceCatalog;

  constructor(deps: VoiceSettingsHandlerDeps) {
    this.logger = deps.logger.withTag("VOICE_UI");
    this.userPrefs = deps.userPrefs;
    this.localeResolver = deps.localeResolver;
    this.voiceCatalog = deps.voiceCatalog;
  }

  matches(customId: string): boolean {
    return isVoiceComponent(customId);
  }

  async handle(interaction: ComponentInteraction): Promise<void> {
    if (interaction.isButton()) {
      if (interaction.customId === VOICE_CUSTOM_IDS.configButton) {
        await this.openConfig(interaction);
        return;
      }
      if (interaction.customId === VOICE_CUSTOM_IDS.resetButton) {
        await this.handleReset(interaction);
        return;
      }
    }
    if (interaction.isStringSelectMenu()) {
      switch (interaction.customId) {
        case VOICE_CUSTOM_IDS.languageSelect:
          await this.handleLanguageSelect(interaction);
          return;
        case VOICE_CUSTOM_IDS.providerSelect:
          await this.handleProviderSelect(interaction);
          return;
        case VOICE_CUSTOM_IDS.variantSelect:
          await this.handleVariantSelect(interaction);
          return;
        case VOICE_CUSTOM_IDS.speedSelect:
          await this.handleSpeedSelect(interaction);
          return;
        case VOICE_CUSTOM_IDS.pitchSelect:
          await this.handlePitchSelect(interaction);
          return;
      }
    }
  }

  private async openConfig(interaction: ButtonInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const ownerId = interaction.message.interactionMetadata?.user?.id;
    if (ownerId && ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(locale, "commands.voice.reset.notOwner"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const prefs = await this.userPrefs.getOrDefault(interaction.user.id);
    const { embed, rows } = await buildVoiceConfigInterface({
      prefs,
      locale,
      voiceCatalog: this.voiceCatalog,
    });
    await interaction.reply({
      embeds: [embed],
      components: rows,
      flags: MessageFlags.Ephemeral,
    });
  }

  private async handleReset(interaction: ButtonInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const ownerId = interaction.message.interactionMetadata?.user?.id;
    if (!ownerId || ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(locale, "commands.voice.reset.notOwner"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const userId = ownerId;
    await this.userPrefs.upsertFields(userId, {
      ttsProvider: "basic",
      ttsVoiceId: null,
      ttsSpeed: 1.0,
      ttsPitch: 0.0,
    });
    const refreshed = await this.userPrefs.getOrDefault(userId);
    const embed = buildVoiceDashboardEmbed(refreshed, locale);
    const buttons = buildVoiceDashboardButtons(locale);
    try {
      await interaction.message.edit({
        embeds: [embed],
        components: [buttons],
      });
    } catch (err) {
      this.logger.warn("failed to refresh dashboard after reset", err);
    }
    await interaction.reply({
      content: t(locale, "commands.voice.reset.successDesc"),
      flags: MessageFlags.Ephemeral,
    });
  }

  private async handleLanguageSelect(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const value = interaction.values[0];
    if (!value) {
      await this.replyError(interaction, locale);
      return;
    }
    if (value === NAV_NEXT) {
      await this.refreshConfig(interaction, locale, { languagePage: 2 });
      return;
    }
    if (value === NAV_PREV) {
      await this.refreshConfig(interaction, locale, { languagePage: 1 });
      return;
    }
    const userId = interaction.user.id;
    const voices = await this.voiceCatalog.getVoicesForLanguage(value);
    const supportsWavenet = voices.length > 0;
    const firstVoice = voices[0]?.value ?? null;
    await this.userPrefs.upsertFields(userId, {
      ttsLanguage: value,
      ttsProvider: supportsWavenet ? "wavenet" : "basic",
      ttsVoiceId: supportsWavenet ? firstVoice : null,
    });
    const langInfo = findLanguageByCode(value);
    const footerKey = langInfo ? "commands.voice.config.languageUpdated" : null;
    const footerParams = langInfo ? { language: langInfo.name } : undefined;
    await this.refreshConfig(
      interaction,
      locale,
      undefined,
