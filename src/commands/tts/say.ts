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
  joinChannel,
  isConnected,
  getConnectionChannelId,
} from "../../voice/manager.ts";
import { Colors } from "../../constants/index.ts";
import { queueTTS, QuotaExceededError } from "../../tts/player.ts";
import { validateTTSText } from "../../tts/provider.ts";
import { getTTSLanguage } from "../../settings/tts.ts";
import { MONTHLY_QUOTA_LIMIT } from "../../services/UsageService.ts";
import {
  logCommand,
  createLogEntryFromInteraction,
} from "../../services/LoggerService.ts";

const MAX_MESSAGE_LENGTH = 500;

export const say: Command = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription(en.commands.say.description)
    .setDescriptionLocalizations({
      vi: vi.commands.say.description,
    })
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription(en.commands.say.messageOptionDesc)
        .setDescriptionLocalizations({
          vi: vi.commands.say.messageOptionDesc,
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

      // Log with model info
      logCommand(createLogEntryFromInteraction(interaction, "success", result.modelLabel));
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof QuotaExceededError) {
        const usedFormatted = error.charsUsed.toLocaleString();
        const limitFormatted = MONTHLY_QUOTA_LIMIT.toLocaleString();
        const quotaMessage = t(locale, "commands.profile.quotaExceeded")
          .replace("{used}", usedFormatted)
          .replace("{limit}", limitFormatted);
        
        await interaction.editReply({
          content: quotaMessage,
        });

        // Log quota exceeded
        logCommand(createLogEntryFromInteraction(interaction, "quota_limit"));
        return;
      }

      // Log general error
      logCommand(createLogEntryFromInteraction(interaction, "error"));

      const embed = new EmbedBuilder()
        .setTitle(t(locale, "common.error"))
        .setDescription(t(locale, "commands.say.joinFailed"))
        .setColor(Colors.Error);

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
