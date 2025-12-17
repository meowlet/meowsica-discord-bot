import { EmbedBuilder, SlashCommandBuilder, GuildMember, MessageFlags } from "discord.js";
import type { Command } from "../types/command.ts";
import { t, DEFAULT_LOCALE } from "../i18n/index.ts";
import { getLocale } from "../settings/index.ts";
import { joinChannel } from "../voice/manager.ts";

export const join: Command = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription(t(DEFAULT_LOCALE, "commands.join.description")),

  async execute(interaction) {
    const locale = getLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.join.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: t(locale, "commands.join.notInVoice"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      await joinChannel(voiceChannel);

      const embed = new EmbedBuilder()
        .setTitle(t(locale, "commands.join.success"))
        .setDescription(
          t(locale, "commands.join.joinedChannel", { channel: voiceChannel.name })
        )
        .setColor(0x57f287);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "common.error"))
        .setDescription(t(locale, "commands.join.failed"))
        .setColor(0xed4245);

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
