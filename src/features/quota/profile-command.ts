import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { t } from "../../i18n/translate.ts";
import type { Command } from "../../shared/command.ts";
import { Colors } from "../../shared/colors.ts";
import type { LocaleResolver } from "../settings/locale-resolver.ts";
import type { UserPrefsRepository } from "../settings/user-prefs-repo.ts";
import type { UsageService } from "./usage-service.ts";

export interface ProfileCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly userPrefs: UserPrefsRepository;
  readonly usage: UsageService;
}

export class ProfileCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName("profile")
    .setDescription(en.commands.profile.description)
    .setDescriptionLocalizations({ vi: vi.commands.profile.description });

  private readonly localeResolver: LocaleResolver;
  private readonly userPrefs: UserPrefsRepository;
  private readonly usage: UsageService;

  constructor(deps: ProfileCommandDeps) {
    this.localeResolver = deps.localeResolver;
    this.userPrefs = deps.userPrefs;
    this.usage = deps.usage;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = await this.localeResolver.resolve(interaction);
    const userId = interaction.user.id;
    const prefs = await this.userPrefs.getOrDefault(userId);
    const providerText = prefs.tts.provider === "wavenet" ? "Wavenet" : "Basic";
    const modelText =
      prefs.tts.provider === "wavenet" && prefs.tts.voiceId
        ? prefs.tts.voiceId
        : t(locale, "commands.profile.model.auto");
    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.profile.title"))
      .setColor(Colors.Wavenet)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        {
          name: t(locale, "commands.profile.fields.provider"),
          value: providerText,
          inline: false,
        },
        {
          name: t(locale, "commands.profile.fields.model"),
          value: modelText,
          inline: false,
        },
      );
    try {
      const usageLine = await this.usage.formatUsageLine(userId);
      embed.addFields({
        name: t(locale, "commands.profile.fields.usage"),
        value: usageLine,
        inline: false,
      });
    } catch {
      // ignore: usage unavailable
    }
    await interaction.reply({ embeds: [embed] });
  }
}
