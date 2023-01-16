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
