import { EmbedBuilder, SlashCommandBuilder, GuildMember, MessageFlags } from "discord.js";
import type { Command } from "../types/command.ts";
import { t, DEFAULT_LOCALE } from "../i18n/index.ts";
import { getLocale } from "../settings/index.ts";
import { leaveChannel, isConnected, getConnectionChannelId } from "../voice/manager.ts";

export const leave: Command = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription(t(DEFAULT_LOCALE, "commands.leave.description")),

  async execute(interaction) {
    const locale = getLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.leave.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;

    if (!isConnected(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.leave.notConnected"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const userChannelId = member.voice.channel?.id;
    const botChannelId = getConnectionChannelId(guildId);

    if (!userChannelId || userChannelId !== botChannelId) {
      await interaction.reply({
        content: t(locale, "commands.leave.notInSameChannel"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const success = leaveChannel(guildId);

    if (success) {
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "commands.leave.success"))
        .setDescription(t(locale, "commands.leave.disconnected"))
        .setColor(0x57f287);

      await interaction.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "common.error"))
        .setDescription(t(locale, "commands.leave.failed"))
        .setColor(0xed4245);

      await interaction.reply({ embeds: [embed] });
    }
  },
};
