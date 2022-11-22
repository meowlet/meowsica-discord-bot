import {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { t } from "../../i18n/translate.ts";
import type { Command } from "../../shared/command.ts";
import { Colors } from "../../shared/colors.ts";
import type { LocaleResolver } from "../settings/locale-resolver.ts";
import type { VoiceManager } from "../voice/voice-manager.ts";
import type { PlayerManager } from "./player-manager.ts";

export interface SkipCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
  readonly player: PlayerManager;
}

export class SkipCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName(en.commands.skip.name)
    .setDescription(en.commands.skip.description)
    .setDescriptionLocalizations({ vi: vi.commands.skip.description });

  private readonly localeResolver: LocaleResolver;
  private readonly voice: VoiceManager;
  private readonly player: PlayerManager;

  constructor(deps: SkipCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.voice = deps.voice;
    this.player = deps.player;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: t(locale, "commands.skip.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const guildId = interaction.guildId;
    if (!this.voice.isConnected(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.skip.notConnected"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const channel = interaction.member.voice.channel;
    const botChannelId = this.voice.getChannelId(guildId);
    if (!channel || channel.id !== botChannelId) {
      await interaction.reply({
        content: t(locale, "commands.skip.notInSameChannel"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!this.player.isPlaying(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.skip.nothingPlaying"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    this.player.skipMessage(guildId);
    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.skip.success"))
      .setDescription(t(locale, "commands.skip.skipped"))
      .setColor(Colors.Success);
    await interaction.reply({ embeds: [embed] });
  }
}
