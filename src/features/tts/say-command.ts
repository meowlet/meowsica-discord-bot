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
