import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../../types/command.ts";
import { t } from "../../i18n/index.ts";
import { getLocale } from "../../settings/db.ts";
import { isConnected } from "../../voice/manager.ts";
import { Colors } from "../../constants/index.ts";
import { getQueueStatus } from "../../tts/player.ts";
import { getVoiceLanguageDisplay } from "../../tts/voices.ts";

export const queue: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current TTS queue")
    .setDescriptionLocalizations({
      vi: "Xem hàng đợi TTS hiện tại",
    }),

  async execute(interaction) {
    const locale = getLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.queue.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;

    if (!isConnected(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.queue.notConnected"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const status = getQueueStatus(guildId);

    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.queue.title"))
      .setColor(Colors.Primary);

    if (!status.currentItem && status.queue.length === 0) {
      embed.setDescription(t(locale, "commands.queue.empty"));
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (status.currentItem) {
      const truncated =
        status.currentItem.originalText.length > 100
          ? status.currentItem.originalText.slice(0, 100) + "..."
          : status.currentItem.originalText;

      const lang = status.currentItem.payloads[0]?.language ?? "en";

      embed.addFields({
        name: t(locale, "commands.queue.nowPlaying"),
        value: `"${truncated}"\n${getVoiceLanguageDisplay(lang)}`,
        inline: false,
      });
    }

    if (status.queue.length > 0) {
      const maxShow = 5;
      const toShow = status.queue.slice(0, maxShow);

      const upNextList = toShow
        .map((item, index) => {
          const truncated =
            item.originalText.length > 50
              ? item.originalText.slice(0, 50) + "..."
              : item.originalText;
          return `**${index + 1}.** "${truncated}"`;
        })
        .join("\n");

      let upNextValue = upNextList;

      if (status.queue.length > maxShow) {
        upNextValue += `\n${t(locale, "commands.queue.moreItems", {
          count: (status.queue.length - maxShow).toString(),
        })}`;
      }

      embed.addFields({
        name: t(locale, "commands.queue.upNext"),
        value: upNextValue,
        inline: false,
      });
    }

    const totalItems = (status.currentItem ? 1 : 0) + status.queue.length;
    embed.setFooter({
      text: t(locale, "commands.queue.totalItems", {
        count: totalItems.toString(),
      }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
