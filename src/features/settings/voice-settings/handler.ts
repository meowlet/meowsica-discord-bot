import {
  MessageFlags,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { t } from "../../../i18n/translate.ts";
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
import { findLanguageByCode } from "../../tts/languages.ts";

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
    await this.userPrefs.resetTuning(userId);
    await this.userPrefs.setTtsProvider(userId, "basic");
    await this.userPrefs.setTtsVoice(userId, null);
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
    await this.userPrefs.setTtsLanguage(userId, value);
    const supportsWavenet = await this.voiceCatalog.hasWavenetSupport(value);
    let footerKey: string | null = null;
    let footerParams: Record<string, string> | undefined;
    if (supportsWavenet) {
      await this.userPrefs.setTtsProvider(userId, "wavenet");
      const voices = await this.voiceCatalog.getVoicesForLanguage(value);
      const firstVoice = voices[0]?.value ?? null;
      await this.userPrefs.setTtsVoice(userId, firstVoice);
    } else {
      await this.userPrefs.setTtsProvider(userId, "basic");
      await this.userPrefs.setTtsVoice(userId, null);
    }
    const langInfo = findLanguageByCode(value);
    if (langInfo) {
      footerKey = "commands.voice.config.languageUpdated";
      footerParams = { language: langInfo.name };
    }
    await this.refreshConfig(
      interaction,
      locale,
      undefined,
      footerKey,
      footerParams,
    );
  }

  private async handleProviderSelect(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const value = interaction.values[0];
    if (value !== "basic" && value !== "wavenet") {
      await this.replyError(interaction, locale);
      return;
    }
    const provider = value as TtsProvider;
    const userId = interaction.user.id;
    await this.userPrefs.setTtsProvider(userId, provider);
    if (provider === "basic") {
      await this.userPrefs.setTtsVoice(userId, null);
    } else {
      const prefs = await this.userPrefs.getOrDefault(userId);
      const lang = prefs.tts.language ?? "vi-VN";
      const voices = await this.voiceCatalog.getVoicesForLanguage(lang);
      await this.userPrefs.setTtsVoice(userId, voices[0]?.value ?? null);
    }
    const providerLabel =
      provider === "wavenet"
        ? t(locale, "commands.voice.config.providerWavenetLabel")
        : t(locale, "commands.voice.config.providerBasicLabel");
    await this.refreshConfig(
      interaction,
      locale,
      undefined,
      "commands.voice.config.providerUpdated",
      { provider: providerLabel },
    );
  }

  private async handleVariantSelect(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const value = interaction.values[0];
    if (!value || value === "none") {
      await this.replyError(interaction, locale);
      return;
    }
    await this.userPrefs.setTtsVoice(interaction.user.id, value);
    const variant = value.split("-").pop() ?? "";
    await this.refreshConfig(
      interaction,
      locale,
      undefined,
      "commands.voice.config.variantUpdated",
      { variant: `Wavenet ${variant}` },
    );
  }

  private async handleSpeedSelect(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const value = interaction.values[0];
    if (!value) {
      await this.replyError(interaction, locale);
      return;
    }
    const speed = Number.parseFloat(value);
    if (Number.isNaN(speed)) {
      await this.replyError(interaction, locale);
      return;
    }
    await this.userPrefs.setTtsSpeed(interaction.user.id, speed);
    const speedLabel = formatSpeedLabel(speed, locale);
    await this.refreshConfig(
      interaction,
      locale,
      undefined,
      "commands.voice.config.speedUpdated",
      { speed: speedLabel },
    );
  }

  private async handlePitchSelect(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const value = interaction.values[0];
    if (!value) {
      await this.replyError(interaction, locale);
      return;
    }
    const pitch = Number.parseFloat(value);
    if (Number.isNaN(pitch)) {
      await this.replyError(interaction, locale);
      return;
    }
    await this.userPrefs.setTtsPitch(interaction.user.id, pitch);
    const pitchLabel = formatPitchLabel(pitch, locale);
    await this.refreshConfig(
      interaction,
      locale,
      undefined,
      "commands.voice.config.pitchUpdated",
      { pitch: pitchLabel },
    );
  }

  private async refreshConfig(
    interaction: StringSelectMenuInteraction,
    locale: string,
    state?: ConfigState,
    footerKey?: string | null,
    footerParams?: Record<string, string>,
  ): Promise<void> {
    const prefs = await this.userPrefs.getOrDefault(interaction.user.id);
    const { embed, rows } = await buildVoiceConfigInterface({
      prefs,
      locale: locale as never,
      voiceCatalog: this.voiceCatalog,
      state,
    });
    if (footerKey) {
      embed.setFooter({ text: t(locale, footerKey, footerParams) });
    }
    await interaction.update({ embeds: [embed], components: rows });
  }

  private async replyError(
    interaction: StringSelectMenuInteraction,
    locale: string,
  ): Promise<void> {
    await interaction.reply({
      content: t(locale, "common.error"),
      flags: MessageFlags.Ephemeral,
    });
  }
}

function formatSpeedLabel(speed: number, locale: string): string {
  if (speed < 0.5) return t(locale, "commands.voice.config.speedSlow");
  if (Math.abs(speed - 1.0) < 0.01) {
    return t(locale, "commands.voice.config.speedNormal");
  }
  return `${speed}x`;
}

function formatPitchLabel(pitch: number, locale: string): string {
  if (pitch < -2.5) return t(locale, "commands.voice.config.pitchDeep");
  if (pitch < 0) return t(locale, "commands.voice.config.pitchMediumLow");
  if (Math.abs(pitch) < 0.01) {
    return t(locale, "commands.voice.config.pitchNormal");
  }
  if (pitch < 5) return t(locale, "commands.voice.config.pitchMediumHigh");
  return t(locale, "commands.voice.config.pitchHigh");
}
