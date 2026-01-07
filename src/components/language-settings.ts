/**
 * Language Settings Component Handler
 *
 * Handles button and select menu interactions for the language dashboard.
 * Implements role-based access for server settings (ManageGuild required).
 */

import {
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { t, type Locale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../i18n/index.ts";
import {
  getUserLocale as getDbUserLocale,
  getServerLocale as getDbServerLocale,
  setUserLocale,
  setServerLocale,
} from "../settings/db.ts";
import { Colors } from "../constants/index.ts";
import {
  buildLanguageDashboardEmbed,
  buildLanguageDashboardButtons,
  getLocaleDisplay,
} from "../commands/misc/language.ts";

/**
 * Get user's locale preference
 */
function getUserLocale(userId: string): Locale {
  return getDbUserLocale(userId) || DEFAULT_LOCALE;
}

/**
 * Language options for select menus
 */
const LANGUAGE_OPTIONS = [
  { code: "en" as Locale, flag: "🇺🇸", name: "English", nativeName: "English" },
  { code: "vi" as Locale, flag: "🇻🇳", name: "Vietnamese", nativeName: "Tiếng Việt" },
];

/**
 * Build user language select menu
 */
function buildUserLanguageSelect(
  currentLanguage: Locale | null,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = LANGUAGE_OPTIONS.map((lang) => {
    return new StringSelectMenuOptionBuilder()
      .setLabel(lang.name)
      .setDescription(lang.nativeName)
      .setValue(lang.code)
      .setEmoji(lang.flag)
      .setDefault(lang.code === currentLanguage);
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId("select_user_language")
    .setPlaceholder(t(locale, "commands.language.config.userPlaceholder"))
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Build server language select menu (Admin only)
 */
function buildServerLanguageSelect(
  currentLanguage: Locale | null,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = LANGUAGE_OPTIONS.map((lang) => {
    return new StringSelectMenuOptionBuilder()
      .setLabel(lang.name)
      .setDescription(lang.nativeName)
      .setValue(lang.code)
      .setEmoji(lang.flag)
      .setDefault(lang.code === currentLanguage);
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId("select_server_language")
    .setPlaceholder(t(locale, "commands.language.config.serverPlaceholder"))
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Build the config interface
 */
function buildConfigInterface(
  userId: string,
  guildId: string | null,
  hasManageGuild: boolean,
  locale: Locale,
): {
  embed: EmbedBuilder;
  rows: ActionRowBuilder<StringSelectMenuBuilder>[];
} {
  const userLang = getDbUserLocale(userId);
  const serverLang = guildId ? getDbServerLocale(guildId) : null;

  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.language.config.title"))
    .setDescription(t(locale, "commands.language.config.subtitle"))
    .setColor(Colors.Primary);

  const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

  // Row 1: User UI Language (always visible)
  rows.push(buildUserLanguageSelect(userLang, locale));

  // Row 2: Server UI Language (visible only for admins in a guild)
  if (guildId && hasManageGuild) {
    rows.push(buildServerLanguageSelect(serverLang, locale));
  }

  return { embed, rows };
}

/**
 * Handle Config button click
 */
export async function handleLanguageConfigButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const locale = getUserLocale(userId);

  // Check if user has ManageGuild permission
  const hasManageGuild = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;

  const { embed, rows } = buildConfigInterface(userId, guildId, hasManageGuild, locale);

  await interaction.reply({
    embeds: [embed],
    components: rows,
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Handle Close button click
 */
export async function handleLanguageCloseButton(
  interaction: ButtonInteraction,
): Promise<void> {
  // Delete the dashboard message
  try {
    await interaction.message.delete();
  } catch (error) {
    // If we can't delete, just acknowledge
    await interaction.reply({
      content: "✅",
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Handle User Language select menu
 */
export async function handleUserLanguageSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const userId = interaction.user.id;
  const selectedLang = interaction.values[0] as Locale;

  if (!selectedLang || !SUPPORTED_LOCALES.includes(selectedLang)) {
    await interaction.reply({
      content: t(getUserLocale(userId), "common.error"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update user locale in database
  setUserLocale(userId, selectedLang);

  // Use the new locale for the response
  const locale = selectedLang;
  const guildId = interaction.guildId;
  const hasManageGuild = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;

  // Rebuild the config interface
  const { embed, rows } = buildConfigInterface(userId, guildId, hasManageGuild, locale);

  const langDisplay = getLocaleDisplay(selectedLang);

  // Update the message
  await interaction.update({
    embeds: [
      embed.setFooter({
        text: t(locale, "commands.language.config.userUpdated", {
          language: langDisplay.name,
        }),
      }),
    ],
    components: rows,
  });
}

/**
 * Handle Server Language select menu
 */
export async function handleServerLanguageSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const userId = interaction.user.id;
  const locale = getUserLocale(userId);
  const guildId = interaction.guildId;
  const selectedLang = interaction.values[0] as Locale;

  // Security check: Validate ManageGuild permission
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: t(locale, "commands.language.config.noPermission"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!guildId) {
    await interaction.reply({
      content: t(locale, "commands.language.config.serverOnly"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!selectedLang || !SUPPORTED_LOCALES.includes(selectedLang)) {
    await interaction.reply({
      content: t(locale, "common.error"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update server locale in database
  setServerLocale(guildId, selectedLang);

  // Rebuild the config interface
  const { embed, rows } = buildConfigInterface(userId, guildId, true, locale);

  const langDisplay = getLocaleDisplay(selectedLang);

  // Update the message
  await interaction.update({
    embeds: [
      embed.setFooter({
        text: t(locale, "commands.language.config.serverUpdated", {
          language: langDisplay.name,
        }),
      }),
    ],
    components: rows,
  });
}

/**
 * Main component interaction router
 */
export async function handleLanguageComponent(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
): Promise<void> {
  const customId = interaction.customId;

  try {
    // Button interactions
    if (interaction.isButton()) {
      if (customId === "btn_language_config") {
        await handleLanguageConfigButton(interaction);
      } else if (customId === "btn_language_close") {
        await handleLanguageCloseButton(interaction);
      }
    }
    // Select menu interactions
    else if (interaction.isStringSelectMenu()) {
      if (customId === "select_user_language") {
        await handleUserLanguageSelect(interaction);
      } else if (customId === "select_server_language") {
        await handleServerLanguageSelect(interaction);
      }
    }
  } catch (error) {
    console.error(`Error handling language component ${customId}:`, error);

    // Attempt to reply with error
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "An error occurred. Please try again.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {}
  }
}

/**
 * Check if an interaction is a language settings component
 */
export function isLanguageComponent(customId: string): boolean {
  return (
    customId === "btn_language_config" ||
    customId === "btn_language_close" ||
    customId === "select_user_language" ||
    customId === "select_server_language"
  );
}
