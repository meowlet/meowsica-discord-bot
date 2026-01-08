import {
  EmbedBuilder,
  SlashCommandBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import type { Command } from "../../types/command.ts";
import { t } from "../../i18n/index.ts";
import { getLocale } from "../../settings/db.ts";
import {
  joinChannel,
  isConnected,
  getConnectionChannelId,
} from "../../voice/manager.ts";
import { Colors } from "../../constants/index.ts";
import { queueTTS } from "../../tts/player.ts";
import { validateTTSText } from "../../tts/provider.ts";
import { getTTSLanguage } from "../../settings/tts.ts";

const MAX_MESSAGE_LENGTH = 500;

export const say: Command = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Say something using text-to-speech")
    .setDescriptionLocalizations({
      vi: "Doc van ban bang giong noi",
    })
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to speak")
        .setDescriptionLocalizations({
          vi: "Noi dung can doc",
        })
        .setRequired(true)
        .setMaxLength(MAX_MESSAGE_LENGTH),
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
    const language = getTTSLanguage(interaction);

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
      const { isEncoreMode } = result;

      // Minimalist embed: color indicates tier, description shows text, footer shows user
      const embed = new EmbedBuilder()
        .setColor(isEncoreMode ? Colors.Encore : Colors.Blurple)
        .setDescription(message)
        .setFooter({
          text: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL(),
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
};
