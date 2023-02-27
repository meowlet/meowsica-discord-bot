import {
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type ActionRowBuilder,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { isSupportedLocale, t, type Locale } from "../../../i18n/translate.ts";
import type { Logger } from "../../../shared/logger.ts";
import type {
  ComponentHandler,
  ComponentInteraction,
} from "../../../shared/command.ts";
import type { GuildSettingsRepository } from "../guild-settings-repo.ts";
import type { UserPrefsRepository } from "../user-prefs-repo.ts";
import type { LocaleResolver } from "../locale-resolver.ts";
import { LANGUAGE_CUSTOM_IDS, isLanguageComponent } from "./custom-ids.ts";
import {
  buildConfigEmbed,
  buildLanguageDashboard,
  buildServerLanguageSelect,
  buildUserLanguageSelect,
  getLocaleDisplay,
} from "./builders.ts";

export interface LanguageSettingsHandlerDeps {
  readonly logger: Logger;
  readonly userPrefs: UserPrefsRepository;
  readonly guildSettings: GuildSettingsRepository;
  readonly localeResolver: LocaleResolver;
}

export class LanguageSettingsHandler implements ComponentHandler {
  private readonly logger: Logger;
  private readonly userPrefs: UserPrefsRepository;
  private readonly guildSettings: GuildSettingsRepository;
  private readonly localeResolver: LocaleResolver;

  constructor(deps: LanguageSettingsHandlerDeps) {
    this.logger = deps.logger.withTag("LANG_UI");
    this.userPrefs = deps.userPrefs;
    this.guildSettings = deps.guildSettings;
    this.localeResolver = deps.localeResolver;
  }

  matches(customId: string): boolean {
    return isLanguageComponent(customId);
  }

  async handle(interaction: ComponentInteraction): Promise<void> {
    const customId = interaction.customId;
    if (interaction.isButton()) {
      if (customId === LANGUAGE_CUSTOM_IDS.configButton) {
        await this.handleConfigButton(interaction);
        return;
      }
      if (customId === LANGUAGE_CUSTOM_IDS.closeButton) {
        await this.handleCloseButton(interaction);
        return;
      }
    }
    if (interaction.isStringSelectMenu()) {
      if (customId === LANGUAGE_CUSTOM_IDS.userSelect) {
        await this.handleUserSelect(interaction);
        return;
      }
      if (customId === LANGUAGE_CUSTOM_IDS.serverSelect) {
        await this.handleServerSelect(interaction);
      }
    }
  }

  private async handleConfigButton(
    interaction: ButtonInteraction,
  ): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const ownerId = interaction.message.interactionMetadata?.user?.id;
    if (ownerId && ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(locale, "commands.language.buttons.notOwner"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const userPrefs = await this.userPrefs.get(interaction.user.id);
    const userLocale =
      userPrefs?.uiLocale && isSupportedLocale(userPrefs.uiLocale)
        ? (userPrefs.uiLocale as Locale)
        : null;
    const guildId = interaction.guildId;
    const hasManageGuild =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ??
      false;
    const serverLocale = await this.getServerLocale(guildId);
    const embed = buildConfigEmbed(locale);
    const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [
      buildUserLanguageSelect(userLocale, locale),
    ];
    if (guildId && hasManageGuild) {
