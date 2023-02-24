import type { ChatInputCommandInteraction, Interaction } from "discord.js";
import type { GuildSettingsRepository } from "./guild-settings-repo.ts";
import type { UserPrefsRepository } from "./user-prefs-repo.ts";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type Locale,
} from "../../i18n/translate.ts";
import {
  DEFAULT_LANGUAGE_CODE,
  isSupportedLanguage,
} from "../tts/languages.ts";

export interface LocaleResolverDeps {
  readonly userPrefs: UserPrefsRepository;
  readonly guildSettings: GuildSettingsRepository;
}

export class LocaleResolver {
  private readonly userPrefs: UserPrefsRepository;
  private readonly guildSettings: GuildSettingsRepository;

  constructor(deps: LocaleResolverDeps) {
    this.userPrefs = deps.userPrefs;
    this.guildSettings = deps.guildSettings;
  }

  async resolve(interaction: Interaction): Promise<Locale> {
    const userId = interaction.user.id;
    const prefs = await this.userPrefs.get(userId);
    if (prefs?.uiLocale && isSupportedLocale(prefs.uiLocale)) {
      return prefs.uiLocale;
    }
    if (interaction.guildId) {
      const settings = await this.guildSettings.get(interaction.guildId);
      if (settings?.uiLocale && isSupportedLocale(settings.uiLocale)) {
        return settings.uiLocale;
      }
    }
    const discordLocale = interaction.locale;
    if (discordLocale) {
      const short = discordLocale.split("-")[0] ?? "";
      if (isSupportedLocale(short)) return short;
    }
    return DEFAULT_LOCALE;
  }

  async resolveTtsLanguage(
    interaction: ChatInputCommandInteraction,
  ): Promise<string> {
    const userId = interaction.user.id;
    const prefs = await this.userPrefs.get(userId);
    if (prefs?.tts.language && isSupportedLanguage(prefs.tts.language)) {
      return prefs.tts.language;
    }
    if (interaction.guildId) {
      const settings = await this.guildSettings.get(interaction.guildId);
      if (settings?.ttsLanguage && isSupportedLanguage(settings.ttsLanguage)) {
        return settings.ttsLanguage;
      }
    }
    return DEFAULT_LANGUAGE_CODE;
  }
}
