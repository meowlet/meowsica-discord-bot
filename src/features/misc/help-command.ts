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

type CommandCategory = "voice" | "tts" | "settings" | "misc";

interface CommandSummary {
  readonly name: string;
  readonly description: string;
  readonly category: CommandCategory;
}

export interface HelpCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly getCommands: () => readonly Command[];
}

export class HelpCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName(en.commands.help.name)
    .setDescription(en.commands.help.description)
    .setDescriptionLocalizations({ vi: vi.commands.help.description });

  private readonly localeResolver: LocaleResolver;
  private readonly getCommands: () => readonly Command[];

  constructor(deps: HelpCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.getCommands = deps.getCommands;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const summaries = this.getCommands().map((cmd) =>
      this.summarize(cmd, locale),
    );
    const grouped: Record<CommandCategory, CommandSummary[]> = {
      voice: [],
      tts: [],
      settings: [],
      misc: [],
    };
    for (const s of summaries) grouped[s.category].push(s);
    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.help.title"))
      .setDescription(t(locale, "commands.help.subtitle"))
      .setColor(Colors.Primary);
    addCategory(embed, locale, grouped.voice, "voice");
    addCategory(embed, locale, grouped.tts, "tts");
    addCategory(embed, locale, grouped.settings, "settings");
    addCategory(embed, locale, grouped.misc, "misc");
    embed.setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  private summarize(cmd: Command, locale: string): CommandSummary {
    const name = cmd.data.name;
    const description = t(locale, `commands.${name}.description`);
    return { name, description, category: categorize(name) };
  }
}

function categorize(name: string): CommandCategory {
  if (name === "join" || name === "leave") return "voice";
  if (
    name === "say" ||
    name === "stop" ||
    name === "skip" ||
    name === "queue"
  ) {
    return "tts";
  }
