import {
  EmbedBuilder,
  SlashCommandBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import type { Command } from "../../types/command.ts";
import { t, DEFAULT_LOCALE } from "../../i18n/index.ts";
import { getLocale } from "../../settings/db.ts";
import {
  joinChannel,
  isConnected,
  getConnectionChannelId,
} from "../../voice/manager.ts";
import { Colors } from "../../constants/index.ts";
import { queueTTS } from "../../tts/player.ts";
import { type VoiceLanguageCode } from "../../tts/voices.ts";
import { validateTTSText } from "../../tts/provider.ts";
import { getTTSLanguage } from "../../settings/tts.ts";
import {
  SUPPORTED_LANGUAGES,
  filterSupportedLanguages,
  isSupportedLanguage,
  getSupportedLanguageByCode,
} from "../../constants/languages.ts";

const MAX_MESSAGE_LENGTH = 500;

export const say: Command = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription(t(DEFAULT_LOCALE, "commands.say.description"))
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription(t(DEFAULT_LOCALE, "commands.say.messageOption"))
        .setRequired(true)
        .setMaxLength(MAX_MESSAGE_LENGTH),
    )
    .addStringOption((option) =>
      option
        .setName("lang")
        .setDescription(t(DEFAULT_LOCALE, "commands.say.langOption"))
        .setRequired(false)
        .setAutocomplete(true),
    ),

  async execute(interaction) {
    const locale = getLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.say.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: t(locale, "commands.say.notInVoice"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;

    if (isConnected(guildId)) {
      const botChannelId = getConnectionChannelId(guildId);
      if (botChannelId && botChannelId !== voiceChannel.id) {
        await interaction.reply({
          content: t(locale, "commands.say.notInSameChannel"),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    const message = interaction.options.getString("message", true);
    const langOption = interaction.options.getString("lang");

    let language: VoiceLanguageCode;
    if (langOption) {
      if (!isSupportedLanguage(langOption)) {
        await interaction.reply({
          content: t(locale, "commands.say.invalidLanguage"),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      language = langOption as VoiceLanguageCode;
    } else {
      language = getTTSLanguage(interaction);
    }

    const validation = validateTTSText(message);
    if (!validation.valid) {
      await interaction.reply({
        content: t(locale, "commands.say.emptyMessage"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      if (!isConnected(guildId)) {
        await joinChannel(voiceChannel);
      }
      const result = queueTTS(
        guildId,
        message,
        language,
        interaction.user.id,
      );
      const { queued, position, isEncoreMode, providerLabel, modelLabel } = result;
      const displayMessage =
        message.length > 100 ? message.slice(0, 100) + "..." : message;
      const title = isEncoreMode
        ? `${t(locale, "encore.badge")} - ${t(locale, "commands.say.success")}`
        : t(locale, "commands.say.success");
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(isEncoreMode ? 0xffd700 : Colors.Success);
      if (queued) {
        embed.setDescription(
          t(locale, "commands.say.queued", { message: displayMessage }),
        );
        embed.addFields({
          name: "Queue Position",
          value: `#${position}`,
          inline: true,
        });
      } else {
        embed.setDescription(
          t(locale, "commands.say.speaking", { message: displayMessage }),
        );
      }
      const langInfo = getSupportedLanguageByCode(language);
      const languageDisplay = langInfo
        ? `${langInfo.name} (${langInfo.nativeName})`
        : language;
      embed.addFields(
        {
          name: "Language",
          value: languageDisplay,
          inline: true,
        },
        {
          name: "Provider",
          value: providerLabel,
          inline: true,
        },
        {
          name: "Model",
          value: modelLabel,
          inline: true,
        },
      );
      if (isEncoreMode) {
        embed.setFooter({ text: t(locale, "encore.modeActive") });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "common.error"))
        .setDescription(t(locale, "commands.say.joinFailed"))
        .setColor(Colors.Error);

      await interaction.editReply({ embeds: [embed] });
    }
  },

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const filtered = filterSupportedLanguages(focusedValue);
    await interaction.respond(
      filtered.slice(0, 25).map((lang) => ({
        name: `${lang.name} (${lang.nativeName})`,
        value: lang.code,
      })),
    );
  },
};
