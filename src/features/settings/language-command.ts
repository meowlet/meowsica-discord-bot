import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { isSupportedLocale, type Locale } from "../../i18n/translate.ts";
import type { Command } from "../../shared/command.ts";
import type { LocaleResolver } from "./locale-resolver.ts";
import type { UserPrefsRepository } from "./user-prefs-repo.ts";
import type { GuildSettingsRepository } from "./guild-settings-repo.ts";
import { buildLanguageDashboard } from "./language-settings/handler.ts";

export interface LanguageCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly userPrefs: UserPrefsRepository;
  readonly guildSettings: GuildSettingsRepository;
}

export class LanguageCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName(en.commands.language.name)
    .setDescription(en.commands.language.description)
    .setDescriptionLocalizations({ vi: vi.commands.language.description });

  private readonly localeResolver: LocaleResolver;
  private readonly userPrefs: UserPrefsRepository;
  private readonly guildSettings: GuildSettingsRepository;

  constructor(deps: LanguageCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.userPrefs = deps.userPrefs;
    this.guildSettings = deps.guildSettings;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const userPrefs = await this.userPrefs.get(interaction.user.id);
    const userLocale = pickLocale(userPrefs?.uiLocale ?? null);
    const guildSettings = interaction.guildId
      ? await this.guildSettings.get(interaction.guildId)
      : null;
    const serverLocale = pickLocale(guildSettings?.uiLocale ?? null);
    const { embed, buttons } = buildLanguageDashboard(
      { userLocale, serverLocale },
      locale,
    );
    await interaction.reply({ embeds: [embed], components: [buttons] });
  }
}

function pickLocale(value: string | null): Locale | null {
  if (!value) return null;
  if (isSupportedLocale(value)) return value;
  return null;
}
