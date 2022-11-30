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

export interface StopCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
  readonly player: PlayerManager;
}

export class StopCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName(en.commands.stop.name)
    .setDescription(en.commands.stop.description)
    .setDescriptionLocalizations({ vi: vi.commands.stop.description });

  private readonly localeResolver: LocaleResolver;
  private readonly voice: VoiceManager;
  private readonly player: PlayerManager;

  constructor(deps: StopCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.voice = deps.voice;
    this.player = deps.player;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: t(locale, "commands.stop.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const guildId = interaction.guildId;
    if (!this.voice.isConnected(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.stop.notConnected"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const channel = interaction.member.voice.channel;
    const botChannelId = this.voice.getChannelId(guildId);
    if (!channel || channel.id !== botChannelId) {
      await interaction.reply({
        content: t(locale, "commands.stop.notInSameChannel"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const cleared = this.player.clear(guildId);
    this.player.cleanup(guildId);
    this.voice.leave(guildId);
    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.stop.success"))
      .setDescription(t(locale, "commands.stop.stopped"))
      .setColor(Colors.Success);
    if (cleared > 0) {
      embed.addFields({
        name: t(locale, "commands.stop.queueField"),
        value: t(locale, "commands.stop.cleared", {
          count: cleared.toString(),
        }),
        inline: true,
      });
    }
    await interaction.reply({ embeds: [embed] });
  }
}
