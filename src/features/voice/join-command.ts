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

export interface JoinCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
}

export class JoinCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName("join")
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
    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.join.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const member = interaction.member as GuildMember;
    const channel = member.voice.channel;
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
    } catch {
      const embed = new EmbedBuilder()
        .setTitle(t(locale, "common.error"))
        .setDescription(t(locale, "commands.join.failed"))
        .setColor(Colors.Error);
      await interaction.editReply({ embeds: [embed] });
    }
  }
}
