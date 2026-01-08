import {
  EmbedBuilder,
  SlashCommandBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import type { Command } from "../../types/command.ts";
import { t } from "../../i18n/index.ts";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { getLocale } from "../../settings/db.ts";
import { isConnected, getConnectionChannelId } from "../../voice/manager.ts";
import { Colors } from "../../constants/index.ts";
import { skipCurrent, getQueueStatus } from "../../tts/player.ts";

export const skip: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription(en.commands.skip.description)
    .setDescriptionLocalizations({
      vi: vi.commands.skip.description,
    }),

  async execute(interaction) {
    const locale = getLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.skip.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;

    if (!isConnected(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.skip.notConnected"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;
    const botChannelId = getConnectionChannelId(guildId);

    if (!voiceChannel || voiceChannel.id !== botChannelId) {
      await interaction.reply({
        content: t(locale, "commands.skip.notInSameChannel"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const status = getQueueStatus(guildId);
    if (!status.isPlaying) {
      await interaction.reply({
        content: t(locale, "commands.skip.nothingPlaying"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    skipCurrent(guildId);

    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.skip.success"))
      .setDescription(t(locale, "commands.skip.skipped"))
      .setColor(Colors.Success);

    await interaction.reply({ embeds: [embed] });
  },
};
