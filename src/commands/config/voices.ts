import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../../types/command.ts";
import { t, DEFAULT_LOCALE } from "../../i18n/index.ts";
import {
  getLocale,
  isPremiumUser,
  getUserVoicePreferences,
  setUserVoicePreferences,
} from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";
import {
  SUPPORTED_LANGUAGES,
  filterSupportedLanguages,
  getSupportedLanguageByCode,
} from "../../constants/languages.ts";
import { filterWavenetVoices } from "../../services/GoogleTTSService.ts";

const LANGUAGES_PER_PAGE = 10;

export const voices: Command = {
  data: new SlashCommandBuilder()
    .setName("voices")
    .setDescription(t(DEFAULT_LOCALE, "commands.voices.description"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription(t(DEFAULT_LOCALE, "commands.voices.list.description"))
        .addIntegerOption((option) =>
          option
            .setName("page")
            .setDescription(t(DEFAULT_LOCALE, "commands.voices.list.pageOption"))
            .setRequired(false)
            .setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription(t(DEFAULT_LOCALE, "commands.voices.set.description"))
        .addStringOption((option) =>
          option
            .setName("language")
            .setDescription(t(DEFAULT_LOCALE, "commands.voices.set.languageOption"))
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("variant")
            .setDescription(t(DEFAULT_LOCALE, "commands.voices.set.variantOption"))
            .setRequired(false)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("provider")
            .setDescription(t(DEFAULT_LOCALE, "commands.voices.set.providerOption"))
            .setRequired(false)
            .addChoices(
              { name: "Basic (Google Translate)", value: "basic" },
              { name: "Premium (Google Wavenet)", value: "premium" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription(t(DEFAULT_LOCALE, "commands.voices.info.description")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset")
        .setDescription(t(DEFAULT_LOCALE, "commands.voices.reset.description")),
    ),

  async execute(interaction) {
    const locale = getLocale(interaction);
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "list") {
      await handleListSubcommand(interaction, locale);
    } else if (subcommand === "set") {
      await handleSetSubcommand(interaction, locale);
    } else if (subcommand === "info") {
      await handleInfoSubcommand(interaction, locale);
    } else if (subcommand === "reset") {
      await handleResetSubcommand(interaction, locale);
    }
  },

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const userId = interaction.user.id;
    const isUserPremium = isPremiumUser(userId);
    if (focusedOption.name === "language") {
      const languages = filterSupportedLanguages(focusedOption.value);
      await interaction.respond(
        languages.slice(0, 25).map((lang) => ({
          name: `${lang.name} (${lang.nativeName})`,
          value: lang.code,
        })),
      );
    } else if (focusedOption.name === "variant") {
      const selectedLanguage = interaction.options.getString("language");
      if (!selectedLanguage) {
        await interaction.respond([
          { name: "Please select a language first", value: "none" },
        ]);
        return;
      }
      if (!isUserPremium) {
        await interaction.respond([
          { name: "Upgrade to Encore for Wavenet voices", value: "none" },
        ]);
        return;
      }
      const lang = getSupportedLanguageByCode(selectedLanguage);
      const cloudCode = lang?.cloudCode || selectedLanguage;
      const voices = await filterWavenetVoices(cloudCode, focusedOption.value);
      await interaction.respond(
        voices.map((voice) => ({
          name: voice.name,
          value: voice.value,
        })),
      );
    }
  },
};

async function handleListSubcommand(
  interaction: Parameters<Command["execute"]>[0],
  locale: string,
): Promise<void> {
  const requestedPage = interaction.options.getInteger("page") ?? 1;
  const languages = [...SUPPORTED_LANGUAGES];
  const totalPages = Math.ceil(languages.length / LANGUAGES_PER_PAGE);
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (page - 1) * LANGUAGES_PER_PAGE;
  const endIndex = Math.min(startIndex + LANGUAGES_PER_PAGE, languages.length);
  const pageLanguages = languages.slice(startIndex, endIndex);
  const languageList = pageLanguages
    .map((lang) => `**${lang.name}** (${lang.nativeName}) \`${lang.code}\``)
    .join("\n");
  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voices.title"))
    .setDescription(t(locale, "commands.voices.subtitle"))
    .setColor(Colors.Primary)
    .addFields(
      {
        name: t(locale, "commands.voices.pageInfo", {
          current: page.toString(),
          total: totalPages.toString(),
        }),
        value: languageList,
        inline: false,
      },
      {
        name: "\u200b",
        value: t(locale, "commands.voices.usage"),
        inline: false,
      },
    )
    .setFooter({
      text: t(locale, "commands.voices.totalLanguages", {
        count: languages.length.toString(),
      }),
    });
  await interaction.reply({ embeds: [embed] });
}

async function handleSetSubcommand(
  interaction: Parameters<Command["execute"]>[0],
  locale: string,
): Promise<void> {
  const languageCode = interaction.options.getString("language", true);
  const variant = interaction.options.getString("variant");
  const provider = interaction.options.getString("provider") as "basic" | "premium" | null;
  const userId = interaction.user.id;
  const isUserPremium = isPremiumUser(userId);
  const voiceLang = getSupportedLanguageByCode(languageCode);
  if (!voiceLang) {
    const embed = new EmbedBuilder()
      .setTitle(t(locale, "common.error"))
      .setDescription(t(locale, "commands.voices.set.invalidLanguage"))
      .setColor(Colors.Error);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }
  const wantsPremium = provider === "premium" || (variant && variant !== "none");
  if (wantsPremium && !isUserPremium) {
    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.voices.set.premiumRestricted"))
      .setDescription(t(locale, "commands.voices.set.premiumRestrictedDesc"))
      .setColor(Colors.Error);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }
  const effectiveProvider = wantsPremium && isUserPremium ? "premium" : "basic";
  const effectiveVoiceName = effectiveProvider === "premium" && variant && variant !== "none"
    ? variant
    : null;
  setUserVoicePreferences(userId, {
    provider: effectiveProvider,
    voiceName: effectiveVoiceName,
    languageCode: voiceLang.code,
  });
  const providerLabel = effectiveProvider === "premium"
    ? "Google Wavenet"
    : "Google Translate";
  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voices.set.success"))
    .setColor(effectiveProvider === "premium" ? 0xffd700 : Colors.Success)
    .addFields(
      {
        name: t(locale, "commands.voices.set.language"),
        value: `${voiceLang.name} (${voiceLang.nativeName})`,
        inline: true,
      },
      {
        name: t(locale, "commands.voices.set.provider"),
        value: providerLabel,
        inline: true,
      },
    );
  if (effectiveVoiceName) {
    embed.addFields({
      name: t(locale, "commands.voices.set.voice"),
      value: `\`${effectiveVoiceName}\``,
      inline: true,
    });
  } else {
    embed.addFields({
      name: t(locale, "commands.voices.set.voice"),
      value: "N/A",
      inline: true,
    });
  }
  await interaction.reply({ embeds: [embed] });
}

async function handleInfoSubcommand(
  interaction: Parameters<Command["execute"]>[0],
  locale: string,
): Promise<void> {
  const userId = interaction.user.id;
  const preferences = getUserVoicePreferences(userId);
  const isUserPremium = isPremiumUser(userId);
  const voiceLang = getSupportedLanguageByCode(preferences.languageCode);
  const providerLabel = preferences.provider === "premium"
    ? "Google Wavenet"
    : "Google Translate";
  const modelLabel = preferences.voiceName || "N/A";
  const languageDisplay = voiceLang
    ? `${voiceLang.name} (${voiceLang.nativeName})`
    : preferences.languageCode;
  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voices.info.title"))
    .setColor(isUserPremium && preferences.provider === "premium" ? 0xffd700 : Colors.Primary)
    .addFields(
      {
        name: t(locale, "commands.voices.info.status"),
        value: isUserPremium
          ? `✨ ${t(locale, "commands.voices.info.premium")}`
          : t(locale, "commands.voices.info.standard"),
        inline: true,
      },
      {
        name: t(locale, "commands.voices.info.language"),
        value: languageDisplay,
        inline: true,
      },
      {
        name: t(locale, "commands.voices.info.provider"),
        value: providerLabel,
        inline: true,
      },
      {
        name: t(locale, "commands.voices.info.model"),
        value: modelLabel,
        inline: true,
      },
    );
  if (!isUserPremium) {
    embed.setFooter({
      text: t(locale, "commands.voices.info.upgradeHint"),
    });
  }
  await interaction.reply({ embeds: [embed] });
}

async function handleResetSubcommand(
  interaction: Parameters<Command["execute"]>[0],
  locale: string,
): Promise<void> {
  const userId = interaction.user.id;
  setUserVoicePreferences(userId, {
    provider: "basic",
    voiceName: null,
    languageCode: "en",
  });
  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voices.reset.success"))
    .setDescription(t(locale, "commands.voices.reset.successDesc"))
    .setColor(Colors.Success);
  await interaction.reply({ embeds: [embed] });
}
