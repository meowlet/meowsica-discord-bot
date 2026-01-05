import {
  EmbedBuilder,
  SlashCommandBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import type { Command } from "../types/command.ts";
import { t, DEFAULT_LOCALE } from "../i18n/index.ts";
import { getLocale } from "../settings/index.ts";
import { leaveChannel, isConnected, getConnectionChannelId } from "../voice/manager.ts";
import { Colors } from "../constants/index.ts";
import { clearQueue, cleanupPlayer } from "../tts/index.ts";

export const stop: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription(t(DEFAULT_LOCALE, "commands.stop.description")),

  async execute(interaction) {
    const locale = getLocale(interaction);

    // Must be in a guild
    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.stop.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;

    // Bot must be connected
    if (!isConnected(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.stop.notConnected"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // User must be in same channel
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;
    const botChannelId = getConnectionChannelId(guildId);

    if (!voiceChannel || voiceChannel.id !== botChannelId) {
      await interaction.reply({
        content: t(locale, "commands.stop.notInSameChannel"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Clear queue and get count
    const clearedCount = clearQueue(guildId);

    // Cleanup player state
    cleanupPlayer(guildId);

    // Leave voice channel
    leaveChannel(guildId);

    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.stop.success"))
      .setDescription(t(locale, "commands.stop.stopped"))
      .setColor(Colors.Success);

    if (clearedCount > 0) {
      embed.addFields({
        name: "Queue",
        value: t(locale, "commands.stop.cleared", { count: clearedCount.toString() }),
        inline: true,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
