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
import { findLanguageByCode } from "./languages.ts";

export interface QueueCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
  readonly player: PlayerManager;
}

export class QueueCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName(en.commands.queue.name)
    .setDescription(en.commands.queue.description)
    .setDescriptionLocalizations({ vi: vi.commands.queue.description });

  private readonly localeResolver: LocaleResolver;
  private readonly voice: VoiceManager;
  private readonly player: PlayerManager;

  constructor(deps: QueueCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.voice = deps.voice;
    this.player = deps.player;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    if (!interaction.guild) {
      await interaction.reply({
        content: t(locale, "commands.queue.serverOnly"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const guildId = interaction.guild.id;
    if (!this.voice.isConnected(guildId)) {
      await interaction.reply({
        content: t(locale, "commands.queue.notConnected"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const status = this.player.getStatus(guildId);
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
      const langInfo = findLanguageByCode(lang);
      const langDisplay = langInfo ? `${langInfo.flag} ${langInfo.name}` : lang;
      embed.addFields({
        name: t(locale, "commands.queue.nowPlaying"),
        value: `"${truncated}"\n${langDisplay}`,
        inline: false,
      });
    }
    if (status.queue.length > 0) {
      const maxShow = 5;
      const upNext = status.queue
        .slice(0, maxShow)
        .map((item, index) => {
          const truncated =
            item.originalText.length > 50
              ? item.originalText.slice(0, 50) + "..."
              : item.originalText;
          return `**${index + 1}.** "${truncated}"`;
        })
        .join("\n");
      const remaining = status.queue.length - maxShow;
      const value =
        remaining > 0
          ? `${upNext}\n${t(locale, "commands.queue.moreItems", {
              count: remaining.toString(),
            })}`
          : upNext;
      embed.addFields({
        name: t(locale, "commands.queue.upNext"),
        value,
        inline: false,
      });
    }
    const total = (status.currentItem ? 1 : 0) + status.queue.length;
    embed.setFooter({
      text: t(locale, "commands.queue.totalItems", {
        count: total.toString(),
      }),
    });
    await interaction.reply({ embeds: [embed] });
  }
}
