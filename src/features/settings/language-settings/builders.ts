import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { t, type Locale } from "../../../i18n/translate.ts";
import { Colors } from "../../../shared/colors.ts";
import { LANGUAGE_CUSTOM_IDS } from "./custom-ids.ts";

export interface LocaleDisplay {
  readonly flag: string;
  readonly name: string;
}

export const LOCALE_OPTIONS: readonly {
  readonly code: Locale;
  readonly flag: string;
  readonly name: string;
  readonly nativeName: string;
}[] = [
  { code: "en", flag: "🇺🇸", name: "English", nativeName: "English" },
  { code: "vi", flag: "🇻🇳", name: "Vietnamese", nativeName: "Tiếng Việt" },
];

export function getLocaleDisplay(locale: Locale | null): LocaleDisplay {
  if (locale === "en") return { flag: "🇺🇸", name: "English" };
  if (locale === "vi") return { flag: "🇻🇳", name: "Tiếng Việt" };
  return { flag: "🌐", name: "Default" };
}

export interface DashboardData {
  readonly userLocale: Locale | null;
  readonly serverLocale: Locale | null;
}

export function buildLanguageDashboard(
  data: DashboardData,
  locale: Locale,
): { embed: EmbedBuilder; buttons: ActionRowBuilder<ButtonBuilder> } {
  const userDisplay = getLocaleDisplay(data.userLocale);
  const serverDisplay = getLocaleDisplay(data.serverLocale);
  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.language.dashboard.title"))
    .setDescription(t(locale, "commands.language.dashboard.subtitle"))
    .setColor(Colors.Primary)
    .addFields(
      {
        name: t(locale, "commands.language.dashboard.userLanguage"),
        value: data.userLocale
          ? `${userDisplay.flag} ${userDisplay.name}`
          : t(locale, "commands.language.dashboard.notSet"),
        inline: false,
      },
      {
        name: t(locale, "commands.language.dashboard.serverLanguage"),
        value: data.serverLocale
          ? `${serverDisplay.flag} ${serverDisplay.name}`
          : t(locale, "commands.language.dashboard.notSet"),
        inline: false,
      },
    )
    .setFooter({
      text: t(locale, "commands.language.dashboard.priorityNote"),
    });
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(LANGUAGE_CUSTOM_IDS.configButton)
      .setLabel(t(locale, "commands.language.buttons.configure"))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(LANGUAGE_CUSTOM_IDS.closeButton)
      .setLabel(t(locale, "commands.language.buttons.close"))
      .setStyle(ButtonStyle.Secondary),
  );
  return { embed, buttons };
}

export function buildUserLanguageSelect(
  current: Locale | null,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = LOCALE_OPTIONS.map((opt) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(opt.name)
      .setDescription(opt.nativeName)
      .setValue(opt.code)
      .setEmoji(opt.flag)
      .setDefault(opt.code === current),
  );
  const select = new StringSelectMenuBuilder()
    .setCustomId(LANGUAGE_CUSTOM_IDS.userSelect)
    .setPlaceholder(t(locale, "commands.language.config.userPlaceholder"))
    .addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export function buildServerLanguageSelect(
  current: Locale | null,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = LOCALE_OPTIONS.map((opt) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(opt.name)
      .setDescription(opt.nativeName)
      .setValue(opt.code)
      .setEmoji(opt.flag)
      .setDefault(opt.code === current),
  );
  const select = new StringSelectMenuBuilder()
    .setCustomId(LANGUAGE_CUSTOM_IDS.serverSelect)
    .setPlaceholder(t(locale, "commands.language.config.serverPlaceholder"))
    .addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export function buildConfigEmbed(locale: Locale): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(t(locale, "commands.language.config.title"))
    .setDescription(t(locale, "commands.language.config.subtitle"))
    .setColor(Colors.Primary);
}
