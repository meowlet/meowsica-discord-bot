import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/command.ts";
import {
  t,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from "../i18n/index.ts";
import {
  getLocale,
  setUserLocale,
  setServerLocale,
  setUserVoice,
  setServerVoice,
} from "../settings/index.ts";

const langChoices = [
  { name: "English", value: "en" },
  { name: "Tiếng Việt", value: "vi" },
] as const;

export const lang: Command = {
  data: new SlashCommandBuilder()
    .setName("lang")
    .setDescription(t(DEFAULT_LOCALE, "commands.lang.description"))
    // UI subcommand group
    .addSubcommandGroup((group) =>
      group
        .setName("interface")
        .setDescription(
          t(DEFAULT_LOCALE, "commands.lang.interface.description")
        )
        .addSubcommand((sub) =>
          sub
            .setName("user")
            .setDescription(t(DEFAULT_LOCALE, "commands.lang.interface.user"))
            .addStringOption((opt) =>
              opt
                .setName("lang")
                .setDescription(t(DEFAULT_LOCALE, "commands.lang.option"))
                .setRequired(true)
                .addChoices(...langChoices)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("server")
            .setDescription(t(DEFAULT_LOCALE, "commands.lang.interface.server"))
            .addStringOption((opt) =>
              opt
                .setName("lang")
                .setDescription(t(DEFAULT_LOCALE, "commands.lang.option"))
                .setRequired(true)
                .addChoices(...langChoices)
            )
        )
    )
    // Speech (TTS) subcommand group
    .addSubcommandGroup((group) =>
      group
        .setName("speech")
        .setDescription(t(DEFAULT_LOCALE, "commands.lang.speech.description"))
        .addSubcommand((sub) =>
          sub
            .setName("user")
            .setDescription(t(DEFAULT_LOCALE, "commands.lang.speech.user"))
            .addStringOption((opt) =>
              opt
                .setName("lang")
                .setDescription(t(DEFAULT_LOCALE, "commands.lang.option"))
                .setRequired(true)
                .addChoices(...langChoices)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("server")
            .setDescription(t(DEFAULT_LOCALE, "commands.lang.speech.server"))
            .addStringOption((opt) =>
              opt
                .setName("lang")
                .setDescription(t(DEFAULT_LOCALE, "commands.lang.option"))
                .setRequired(true)
                .addChoices(...langChoices)
            )
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(true);
    const subcommand = interaction.options.getSubcommand(true);
    const lang = interaction.options.getString("lang", true) as Locale;
    const locale = getLocale(interaction);

    if (!SUPPORTED_LOCALES.includes(lang)) {
      await interaction.reply({
        content: t(locale, "common.error"),
        ephemeral: true,
      });
      return;
    }

    // Check server permission for server subcommands
    if (subcommand === "server") {
      if (
        !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
      ) {
        await interaction.reply({
          content: t(locale, "commands.lang.noPermission"),
          ephemeral: true,
        });
        return;
      }

      if (!interaction.guildId) {
        await interaction.reply({
          content: t(locale, "commands.lang.serverOnly"),
          ephemeral: true,
        });
        return;
      }
    }

    // Handle UI settings
    if (group === "interface") {
      if (subcommand === "user") {
        setUserLocale(interaction.user.id, lang);
        await interaction.reply({
          content: t(lang, "commands.lang.interface.userSuccess"),
          ephemeral: true,
        });
      } else {
        setServerLocale(interaction.guildId!, lang);
        await interaction.reply({
          content: t(lang, "commands.lang.interface.serverSuccess"),
        });
      }
    }

    // Handle speech settings
    if (group === "speech") {
      if (subcommand === "user") {
        setUserVoice(interaction.user.id, lang);
        await interaction.reply({
          content: t(lang, "commands.lang.speech.userSuccess"),
          ephemeral: true,
        });
      } else {
        setServerVoice(interaction.guildId!, lang);
        await interaction.reply({
          content: t(lang, "commands.lang.speech.serverSuccess"),
        });
      }
    }
  },
};
