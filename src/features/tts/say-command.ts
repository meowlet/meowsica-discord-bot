import {
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { t } from "../../i18n/translate.ts";
import type { Command } from "../../shared/command.ts";
import { Colors } from "../../shared/colors.ts";
import { QuotaExceededError } from "../../shared/errors.ts";
import type { LocaleResolver } from "../settings/locale-resolver.ts";
import type { VoiceManager } from "../voice/voice-manager.ts";
import type { PlayerManager } from "./player-manager.ts";
import type { CommandLoggerService } from "../logs/command-logger-service.ts";
import type { UsageService } from "../quota/usage-service.ts";
import { validateText } from "./text-prep.ts";

const MAX_MESSAGE_LENGTH = 500;

export interface SayCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
  readonly player: PlayerManager;
  readonly commandLogger: CommandLoggerService;
  readonly usage: UsageService;
}

export class SayCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName("say")
    .setDescription(en.commands.say.description)
    .setDescriptionLocalizations({ vi: vi.commands.say.description })
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription(en.commands.say.messageOptionDesc)
        .setDescriptionLocalizations({ vi: vi.commands.say.messageOptionDesc })
        .setRequired(true)
        .setMaxLength(MAX_MESSAGE_LENGTH),
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
    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.say.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const member = interaction.member as GuildMember;
    const channel = member.voice.channel;
    if (!channel) {
      await interaction.reply({
        content: t(locale, "commands.say.notInVoice"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const guildId = interaction.guild.id;
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
      await interaction.reply({
        content: t(locale, "commands.say.emptyMessage"),
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
        text: message,
        language,
        userId: interaction.user.id,
      });
      const isWavenet = result.provider === "wavenet";
      const embed = new EmbedBuilder()
        .setColor(isWavenet ? Colors.Wavenet : Colors.Blurple)
        .setDescription(message)
        .setFooter({
          text: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL(),
        });
      await interaction.editReply({ embeds: [embed] });
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
        await interaction.editReply({ content: quotaMessage });
        this.commandLogger.log(
          this.commandLogger.fromInteraction(interaction, "quota_limit"),
        );
        return;
      }
      this.commandLogger.log(
        this.commandLogger.fromInteraction(interaction, "error"),
      );
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "common.error"))
        .setDescription(t(locale, "commands.say.joinFailed"))
        .setColor(Colors.Error);
      await interaction.editReply({ embeds: [embed] });
    }
  }
}
