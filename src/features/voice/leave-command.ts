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
import type { LocaleResolver } from "../settings/locale-resolver.ts";
import type { VoiceManager } from "./voice-manager.ts";

export interface LeaveCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
}

export class LeaveCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName("leave")
    .setDescription(en.commands.leave.description)
    .setDescriptionLocalizations({ vi: vi.commands.leave.description });

  private readonly localeResolver: LocaleResolver;
  private readonly voice: VoiceManager;

  constructor(deps: LeaveCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.voice = deps.voice;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.leave.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const guildId = interaction.guild.id;
    if (!this.voice.isConnected(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.leave.notConnected"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const member = interaction.member as GuildMember;
    const userChannelId = member.voice.channel?.id;
    const botChannelId = this.voice.getChannelId(guildId);
    if (!userChannelId || userChannelId !== botChannelId) {
      await interaction.reply({
        content: t(locale, "commands.leave.notInSameChannel"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const success = this.voice.leave(guildId);
    if (success) {
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "commands.leave.success"))
        .setDescription(t(locale, "commands.leave.disconnected"))
        .setColor(Colors.Success);
      await interaction.reply({ embeds: [embed] });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(t(locale, "common.error"))
      .setDescription(t(locale, "commands.leave.failed"))
      .setColor(Colors.Error);
    await interaction.reply({ embeds: [embed] });
  }
}
