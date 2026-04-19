import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import type { Command } from "../../shared/command.ts";
import type { LocaleResolver } from "./locale-resolver.ts";
import type { UserPrefsRepository } from "./user-prefs-repo.ts";
import {
  buildVoiceDashboardButtons,
  buildVoiceDashboardEmbed,
} from "./voice-settings/dashboard-builder.ts";

export interface VoiceCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly userPrefs: UserPrefsRepository;
}

export class VoiceCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName("voice")
    .setDescription(en.commands.voice.description)
    .setDescriptionLocalizations({ vi: vi.commands.voice.description });

  private readonly localeResolver: LocaleResolver;
  private readonly userPrefs: UserPrefsRepository;

  constructor(deps: VoiceCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.userPrefs = deps.userPrefs;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const prefs = await this.userPrefs.getOrDefault(interaction.user.id);
    const embed = buildVoiceDashboardEmbed(prefs, locale);
    const buttons = buildVoiceDashboardButtons(locale);
    await interaction.reply({ embeds: [embed], components: [buttons] });
  }
}
