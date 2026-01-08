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
import {
  leaveChannel,
  isConnected,
  getConnectionChannelId,
} from "../../voice/manager.ts";
import { Colors } from "../../constants/index.ts";

export const leave: Command = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription(en.commands.leave.description)
    .setDescriptionLocalizations({
      vi: vi.commands.leave.description,
    }),

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
        .setColor(Colors.Success);

      await interaction.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "common.error"))
        .setDescription(t(locale, "commands.leave.failed"))
        .setColor(Colors.Error);

      await interaction.reply({ embeds: [embed] });
    }
  },
};
