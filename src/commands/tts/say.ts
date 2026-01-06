import {
  EmbedBuilder,
  SlashCommandBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import type { Command } from "../../types/command.ts";
import { t, DEFAULT_LOCALE } from "../../i18n/index.ts";
import { getLocale } from "../../settings/index.ts";
import {
  joinChannel,
  isConnected,
  getConnectionChannelId,
} from "../../voice/manager.ts";
import { Colors } from "../../constants/index.ts";
import {
  queueTTS,
  isValidVoiceLanguage,
  validateTTSText,
  DEFAULT_VOICE_LANGUAGE,
  VOICE_LANGUAGE_CODES,
  getVoiceLanguageDisplay,
  type VoiceLanguageCode,
} from "../../tts/index.ts";
import { getTTSLanguage } from "../../settings/tts.ts";

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
      if (!isValidVoiceLanguage(langOption)) {
        await interaction.reply({
          content: t(locale, "commands.say.invalidLanguage"),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      language = langOption;
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

      const { queued, position } = queueTTS(
        guildId,
        message,
        language,
        interaction.user.id,
      );

      const displayMessage =
        message.length > 100 ? message.slice(0, 100) + "..." : message;

      const embed = new EmbedBuilder()
        .setTitle(t(locale, "commands.say.success"))
        .setColor(Colors.Success);

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

      embed.addFields({
        name: "Language",
        value: getVoiceLanguageDisplay(language),
        inline: true,
      });

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
    const focusedValue = interaction.options.getFocused().toLowerCase();

    const { VOICE_LANGUAGES } = await import("../../tts/voices.ts");

    const filtered = VOICE_LANGUAGE_CODES.filter((code) => {
      const lang = VOICE_LANGUAGES[code];
      if (!lang) return false;
      return (
        code.toLowerCase().includes(focusedValue) ||
        lang.name.toLowerCase().includes(focusedValue) ||
        (lang.nativeName?.toLowerCase().includes(focusedValue) ?? false)
      );
    }).slice(0, 25);

    await interaction.respond(
      filtered.map((code) => {
        const lang = VOICE_LANGUAGES[code]!;
        return {
          name: `${lang.emoji} ${lang.name} (${code})`,
          value: code,
        };
      }),
    );
  },
};
