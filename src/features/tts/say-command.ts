import {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { t, type Locale } from "../../i18n/translate.ts";
import type { Command } from "../../shared/command.ts";
import { Colors } from "../../shared/colors.ts";
import { QuotaExceededError, VoiceJoinError } from "../../shared/errors.ts";
import type { LocaleResolver } from "../settings/locale-resolver.ts";
import type { VoiceManager } from "../voice/voice-manager.ts";
import type { PlayerManager, QueueResult } from "./player-manager.ts";
import type { CommandLoggerService } from "../logs/command-logger-service.ts";
import type { UsageService } from "../quota/usage-service.ts";
import { MAX_SAY_LENGTH, validateText } from "./text-prep.ts";

export interface SayCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
  readonly player: PlayerManager;
  readonly commandLogger: CommandLoggerService;
  readonly usage: UsageService;
}

export class SayCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName(en.commands.say.name)
    .setDescription(en.commands.say.description)
    .setDescriptionLocalizations({ vi: vi.commands.say.description })
    .addStringOption((opt) =>
      opt
        .setName(en.commands.say.messageOptionName)
        .setNameLocalizations({ vi: vi.commands.say.messageOptionName })
        .setDescription(en.commands.say.messageOptionDesc)
        .setDescriptionLocalizations({ vi: vi.commands.say.messageOptionDesc })
        .setRequired(true)
        .setMaxLength(MAX_SAY_LENGTH),
    );

  readonly selfLog = true;

  private readonly localeResolver: LocaleResolver;
  private readonly voice: VoiceManager;
  private readonly player: PlayerManager;
  private readonly commandLogger: CommandLoggerService;
  private readonly usage: UsageService;

  constructor(deps: SayCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.voice = deps.voice;
    this.player = deps.player;
    this.commandLogger = deps.commandLogger;
    this.usage = deps.usage;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: t(locale, "commands.say.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const channel = interaction.member.voice.channel;
    if (!channel) {
      await interaction.reply({
        content: t(locale, "commands.say.notInVoice"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const guildId = interaction.guildId;
    if (this.voice.isConnected(guildId)) {
      const botChannelId = this.voice.getChannelId(guildId);
      if (botChannelId && botChannelId !== channel.id) {
        await interaction.reply({
          content: t(locale, "commands.say.notInSameChannel"),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }
    const message = interaction.options.getString("message", true);
    const validation = validateText(message);
    if (!validation.valid) {
      const content =
        validation.error === "too_long"
          ? t(locale, "commands.say.messageTooLong", { max: MAX_SAY_LENGTH })
          : t(locale, "commands.say.emptyMessage");
      await interaction.reply({
        content,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const throttle = this.player.tryAcquireThrottle(interaction.user.id);
    if (!throttle.ok) {
      const seconds = Math.max(1, Math.ceil((throttle.retryAfterMs ?? 0) / 1000));
      await interaction.reply({
        content: t(locale, "commands.say.rateLimited", { seconds }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const language = await this.localeResolver.resolveTtsLanguage(interaction);
    await interaction.deferReply();
    try {
      if (!this.voice.isConnected(guildId)) {
        await this.voice.join(channel);
      }
      const result = await this.player.queue({
        guildId,
        text: validation.sanitized,
        language,
        userId: interaction.user.id,
      });
      if (result.rejection) {
        await this.handleRejection(interaction, locale, result);
        return;
      }
      const isWavenet = result.provider === "wavenet";
      const embed = new EmbedBuilder()
        .setColor(isWavenet ? Colors.Wavenet : Colors.Blurple)
        .setDescription(validation.sanitized)
        .setFooter({
          text: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL(),
        });
      await interaction.editReply({
        embeds: [embed],
        allowedMentions: { parse: [] },
      });
      this.commandLogger.log(
        this.commandLogger.fromInteraction(
          interaction,
          "success",
          result.modelLabel,
        ),
      );
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        const quotaMessage = t(locale, "commands.profile.quotaExceeded", {
          used: err.used.toLocaleString(),
          limit: err.limit.toLocaleString(),
        });
        await this.replyEphemeralAfterDefer(interaction, quotaMessage);
        this.commandLogger.log(
          this.commandLogger.fromInteraction(interaction, "quota_limit"),
        );
        return;
      }
      this.commandLogger.log(
        this.commandLogger.fromInteraction(interaction, "error"),
      );
      await this.replyEphemeralAfterDefer(
        interaction,
        sayJoinErrorMessage(locale, err),
      );
    }
  }

  private async handleRejection(
    interaction: ChatInputCommandInteraction,
    locale: Locale,
    result: QueueResult,
  ): Promise<void> {
    this.commandLogger.log(
      this.commandLogger.fromInteraction(interaction, "error"),
    );
    const content = this.formatRejection(locale, result);
    await this.replyEphemeralAfterDefer(interaction, content);
  }

  private formatRejection(locale: Locale, result: QueueResult): string {
    if (result.rejection === "queue_full") {
      return t(locale, "commands.say.queueFull", {
        max: this.player.getMaxQueueSize(),
      });
    }
    return t(locale, "commands.say.emptyMessage");
  }

  private async replyEphemeralAfterDefer(
    interaction: ChatInputCommandInteraction,
    content: string,
  ): Promise<void> {
    try {
      await interaction.deleteReply();
    } catch {
      // noop
    }
    try {
      await interaction.followUp({
        content,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    } catch {
      // noop
    }
  }
}

function sayJoinErrorMessage(locale: Locale, err: unknown): string {
  if (!(err instanceof VoiceJoinError)) {
    return t(locale, "commands.say.joinFailed");
  }
  switch (err.reason) {
    case "not_joinable":
      return t(locale, "commands.join.notJoinable");
    case "not_speakable":
      return t(locale, "commands.join.notSpeakable");
    case "channel_full":
      return t(locale, "commands.join.channelFull");
    default:
      return t(locale, "commands.say.joinFailed");
  }
}
