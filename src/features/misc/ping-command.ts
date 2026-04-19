import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { t } from "../../i18n/translate.ts";
import type { Command } from "../../shared/command.ts";
import type { LocaleResolver } from "../settings/locale-resolver.ts";
import { Colors } from "../../shared/colors.ts";

export interface PingCommandDeps {
  readonly localeResolver: LocaleResolver;
}

export class PingCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName("ping")
    .setDescription(en.commands.ping.description)
    .setDescriptionLocalizations({ vi: vi.commands.ping.description });

  private readonly localeResolver: LocaleResolver;

  constructor(deps: PingCommandDeps) {
    this.localeResolver = deps.localeResolver;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const response = await interaction.reply({
      content: t(locale, "commands.ping.pinging"),
      withResponse: true,
    });
    const message = response.resource?.message;
    const latency = message
      ? message.createdTimestamp - interaction.createdTimestamp
      : 0;
    const apiLatency = Math.round(interaction.client.ws.ping);
    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.ping.title"))
      .setDescription(t(locale, "commands.ping.subtitle"))
      .addFields(
        {
          name: t(locale, "commands.ping.latency"),
          value: `\`${latency}ms\``,
          inline: false,
        },
        {
          name: t(locale, "commands.ping.apiLatency"),
          value: `\`${apiLatency}ms\``,
          inline: false,
        },
      )
      .setColor(Colors.Primary);
    await interaction.editReply({ content: "", embeds: [embed] });
  }
}
