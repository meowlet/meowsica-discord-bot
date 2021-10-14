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
import { VoiceJoinError } from "../../shared/errors.ts";
import type { LocaleResolver } from "../settings/locale-resolver.ts";
import type { VoiceManager } from "./voice-manager.ts";

export interface JoinCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
}

export class JoinCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName(en.commands.join.name)
    .setDescription(en.commands.join.description)
    .setDescriptionLocalizations({ vi: vi.commands.join.description });

  private readonly localeResolver: LocaleResolver;
  private readonly voice: VoiceManager;

  constructor(deps: JoinCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.voice = deps.voice;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: t(locale, "commands.join.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const channel = interaction.member.voice.channel;
    if (!channel) {
      await interaction.reply({
        content: t(locale, "commands.join.notInVoice"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferReply();
    try {
      await this.voice.join(channel);
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "commands.join.success"))
        .setDescription(
          t(locale, "commands.join.joinedChannel", { channel: channel.name }),
        )
        .setColor(Colors.Success);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "common.error"))
        .setDescription(joinErrorMessage(locale, err))
        .setColor(Colors.Error);
      await interaction.editReply({ embeds: [embed] });
    }
  }
}

function joinErrorMessage(locale: Locale, err: unknown): string {
  if (!(err instanceof VoiceJoinError)) {
    return t(locale, "commands.join.failed");
  }
  switch (err.reason) {
    case "not_joinable":
      return t(locale, "commands.join.notJoinable");
    case "not_speakable":
      return t(locale, "commands.join.notSpeakable");
    case "channel_full":
      return t(locale, "commands.join.channelFull");
    default:
      return t(locale, "commands.join.failed");
  }
}
