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

    
    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.stop.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;

    
    if (!isConnected(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.stop.notConnected"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    
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

    
    const clearedCount = clearQueue(guildId);

    
    cleanupPlayer(guildId);

    
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
