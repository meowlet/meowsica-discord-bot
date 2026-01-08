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
import { joinChannel } from "../../voice/manager.ts";
import { Colors } from "../../constants/index.ts";

export const join: Command = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription(en.commands.join.description)
    .setDescriptionLocalizations({
      vi: vi.commands.join.description,
    }),

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
          t(locale, "commands.join.joinedChannel", {
            channel: voiceChannel.name,
          }),
        )
        .setColor(Colors.Success);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "common.error"))
        .setDescription(t(locale, "commands.join.failed"))
        .setColor(Colors.Error);

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
