/**
 * Voice Settings Component Handler
 *
 * Handles button and select menu interactions for the voice dashboard.
 * Implements strict role-based access for premium features.
 */

import {
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  ComponentType,
} from "discord.js";
import { t, type Locale, DEFAULT_LOCALE } from "../i18n/index.ts";
import {
  isPremiumUser,
  getUserTTSProfile,
  setUserTTSProfile,
  resetUserToBasicVoice,
  getUserLocale as getDbUserLocale,
} from "../settings/db.ts";
import { Colors } from "../constants/index.ts";
import {
  SUPPORTED_LANGUAGES,
  getSupportedLanguageByCode,
} from "../constants/languages.ts";
import { getWavenetVoicesByLanguage, hasWavenetSupport } from "../services/GoogleTTSService.ts";
import {
  buildVoiceDashboardEmbed,
  buildDashboardButtons,
  getLanguageFlag,
  reconcilePremiumSettings,
} from "../commands/misc/voice.ts";

/**
 * Get user's locale preference
 */
function getUserLocale(userId: string): Locale {
  return getDbUserLocale(userId) || DEFAULT_LOCALE;
}

// Emoji policy: Only country flags (from lang.flag) and ✨ for Encore are allowed

// Navigation values for pagination
const NAV_NEXT = "NAV_NEXT_PAGE";
const NAV_PREV = "NAV_PREV_PAGE";
const LANGUAGES_PER_PAGE = 24; // Leave room for 1 navigation option (Discord max 25)

/**
 * Calculate which page a language appears on based on its index in SUPPORTED_LANGUAGES
 * 
 * @param languageCode - The language code (short code or cloudCode)
 * @returns Page number (1-indexed), defaults to 1 if not found
 */
function getLanguagePage(languageCode: string | null): number {
  if (!languageCode) return 1;

  // Find the language index by matching code or cloudCode
  const index = SUPPORTED_LANGUAGES.findIndex(
    (lang) =>
      lang.code === languageCode ||
      lang.cloudCode === languageCode ||
      languageCode.startsWith(lang.code),
  );

  // If not found, default to page 1
  if (index === -1) return 1;

  // Calculate page (1-indexed)
  return Math.floor(index / LANGUAGES_PER_PAGE) + 1;
}

/**
 * Build language select menu with pagination support
 * 
 * @param currentLanguage - Currently selected language code
 * @param locale - User's UI locale
 * @param page - Page number (1 = first page, 2 = second page, etc.)
 */
function buildLanguageSelect(
  currentLanguage: string | null,
  locale: Locale,
  page: number = 1,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const currentCode = currentLanguage || "vi";
  const totalLanguages = SUPPORTED_LANGUAGES.length;
  const totalPages = Math.ceil(totalLanguages / LANGUAGES_PER_PAGE);

  // Calculate slice indices
  const startIndex = (page - 1) * LANGUAGES_PER_PAGE;
  const endIndex = Math.min(startIndex + LANGUAGES_PER_PAGE, totalLanguages);
  const pageLanguages = SUPPORTED_LANGUAGES.slice(startIndex, endIndex);

  // Build language options for current page
  const options = pageLanguages.map((lang) => {
    return new StringSelectMenuOptionBuilder()
      .setLabel(lang.name)
      .setDescription(lang.nativeName)
      .setValue(lang.cloudCode)
      .setEmoji(lang.flag)
      .setDefault(
        lang.code === currentCode ||
          lang.cloudCode === currentCode ||
          currentCode.startsWith(lang.code),
      );
  });

  // Add navigation options if needed (no emojis per style policy)
  if (page < totalPages) {
    // Not on last page - show "More Languages..." option
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(t(locale, "commands.voice.config.moreLanguages"))
        .setDescription(t(locale, "commands.voice.config.moreLanguagesDesc"))
        .setValue(NAV_NEXT),
    );
  }

  if (page > 1) {
    // Not on first page - show "Back to Top" option
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(t(locale, "commands.voice.config.backToTop"))
        .setDescription(t(locale, "commands.voice.config.backToTopDesc"))
        .setValue(NAV_PREV),
    );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("select_voice_language")
    .setPlaceholder(t(locale, "commands.voice.config.languagePlaceholder"))
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Build provider select menu
 * 
 * Strict Visibility Control:
 * - Free Users: Only see "Basic" option
 * - Premium Users: See both "Basic" and "Encore" options
 * - CAPABILITY CHECK: If language doesn't support Wavenet, hide Encore option
 */
function buildProviderSelect(
  currentProvider: string,
  isUserPremium: boolean,
  supportsWavenet: boolean,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  // Determine if Encore option should be shown
  // Must be Premium user AND the selected language must support Wavenet
  const showEncoreOption = isUserPremium && supportsWavenet;

  // Base option available to all users (no emoji per style policy)
  const options: StringSelectMenuOptionBuilder[] = [
    new StringSelectMenuOptionBuilder()
      .setLabel(t(locale, "commands.voice.config.providerBasicLabel"))
      .setDescription(t(locale, "commands.voice.config.providerBasicDesc"))
      .setValue("basic")
      .setDefault(currentProvider === "basic" || !showEncoreOption),
  ];

  // Premium option only visible to Encore subscribers AND if language supports Wavenet
  if (showEncoreOption) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(t(locale, "commands.voice.config.providerEncoreLabel"))
        .setDescription(t(locale, "commands.voice.config.providerEncoreDesc"))
        .setValue("premium")
        .setEmoji("✨")
        .setDefault(currentProvider === "premium"),
    );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("select_voice_provider")
    .setPlaceholder(
      showEncoreOption
        ? t(locale, "commands.voice.config.providerPlaceholder")
        : t(locale, "commands.voice.config.providerBasicOnly"),
    )
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Build variant/model select menu
 * 
 * CRITICAL: This menu is ONLY enabled when:
 * 1. User has Premium (Encore) subscription AND
 * 2. User has selected 'premium' provider
 */
async function buildVariantSelect(
  currentProvider: string,
  currentLanguage: string | null,
  currentVoiceId: string | null,
  isUserPremium: boolean,
  locale: Locale,
): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
  // The model selector is enabled ONLY if user is Premium AND provider is 'premium'
  const isEncoreMode = isUserPremium && currentProvider === "premium";
  const langCode = currentLanguage || "vi-VN";

  let options: StringSelectMenuOptionBuilder[] = [];

  if (isEncoreMode) {
    try {
      const voices = await getWavenetVoicesByLanguage(langCode);
      if (voices.length > 0) {
        options = voices.slice(0, 25).map((voice) => {
          const variant = voice.value.split("-").pop() || "";
          const genderLabel = voice.gender === "FEMALE" ? "Female" : voice.gender === "MALE" ? "Male" : "Neutral";
          return new StringSelectMenuOptionBuilder()
            .setLabel(`Wavenet ${variant}`)
            .setDescription(`${genderLabel} voice`)
            .setValue(voice.value)
            .setDefault(voice.value === currentVoiceId);
        });
      }
    } catch (error) {
      console.error("Failed to fetch Wavenet voices:", error);
    }
  }

  // If no options available (disabled state), add a placeholder option
  if (options.length === 0) {
    // Determine the reason for being disabled
    let description: string;
    if (!isUserPremium) {
      description = t(locale, "commands.voice.config.variantRequiresEncore");
    } else if (currentProvider !== "premium") {
      description = t(locale, "commands.voice.config.variantBasicMode");
    } else {
      description = t(locale, "commands.voice.config.variantNoVoices");
    }

    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(t(locale, "commands.voice.config.variantNotAvailable"))
        .setDescription(description)
        .setValue("none"),
    );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("select_voice_variant")
    .setPlaceholder(
      isEncoreMode
        ? t(locale, "commands.voice.config.variantPlaceholder")
        : t(locale, "commands.voice.config.variantLockedPlaceholder"),
    )
    .addOptions(options)
    .setDisabled(!isEncoreMode); // CRITICAL: Only enabled in Encore mode

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Config interface state for pagination
 */
interface ConfigState {
  languagePage?: number;
}

/**
 * Build complete config interface
 * 
 * Implements auto-downgrade and strict visibility control:
 * - Auto-downgrades expired premium users to basic
 * - Only shows variant row when user is in Encore mode AND language supports Wavenet
 * - Supports paginated language selection
 * - CAPABILITY CHECK: Hides Encore options if language doesn't support Wavenet
 */
async function buildConfigInterface(
  userId: string,
  locale: Locale,
  state: ConfigState = {},
): Promise<{
  embed: EmbedBuilder;
  rows: ActionRowBuilder<StringSelectMenuBuilder>[];
}> {
  // Auto-downgrade check before rendering config
  reconcilePremiumSettings(userId);

  // Fetch corrected profile after reconciliation
  const profile = getUserTTSProfile(userId);
  const isUserPremium = isPremiumUser(userId);

  // CAPABILITY CHECK: Does the selected language support Wavenet voices?
  const langCode = profile.language || "vi-VN";
  const supportsWavenet = await hasWavenetSupport(langCode);

  // Determine effective provider for UI rendering
  // If language doesn't support Wavenet, treat as basic mode visually
  const effectiveProvider = supportsWavenet ? profile.provider : "basic";

  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voice.config.title"))
    .setDescription(t(locale, "commands.voice.config.subtitle"))
    .setColor(Colors.Primary);

  // Add footnote if Premium user but language lacks Wavenet support
  if (isUserPremium && !supportsWavenet) {
    embed.setFooter({
      text: t(locale, "commands.voice.config.noWavenetForLanguage"),
    });
  }

  // Determine which page to show
  // Priority 1: Explicit page from state (e.g., user clicked Next/Prev)
  // Priority 2: Auto-detect based on user's current language selection
  const languagePage = state.languagePage ?? getLanguagePage(profile.language);
  const languageRow = buildLanguageSelect(profile.language, locale, languagePage);
  const providerRow = buildProviderSelect(effectiveProvider, isUserPremium, supportsWavenet, locale);

  // Build rows array - variant row only included when in Encore mode AND language supports Wavenet
  const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [languageRow, providerRow];

  // STRICT CONDITION: Only add variant row if:
  // 1. User is Premium AND
  // 2. Provider is 'premium' AND
  // 3. Language supports Wavenet
  const isEncoreMode = isUserPremium && effectiveProvider === "premium" && supportsWavenet;
  if (isEncoreMode) {
    const variantRow = await buildVariantSelect(
      effectiveProvider,
      profile.language,
      profile.voiceId,
      isUserPremium,
      locale,
    );
    rows.push(variantRow);
  }

  return { embed, rows };
}

/**
 * Handle Config button click
 */
export async function handleConfigButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const userId = interaction.user.id;
  const locale = getUserLocale(userId);

  const { embed, rows } = await buildConfigInterface(userId, locale);

  await interaction.reply({
    embeds: [embed],
    components: rows,
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Handle Reset button click
 */
export async function handleResetButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const userId = interaction.user.id;
  const locale = getUserLocale(userId);

  // Reset to defaults
  resetUserToBasicVoice(userId);

  // Update the dashboard embed
  const embed = buildVoiceDashboardEmbed(userId, locale);
  const buttons = buildDashboardButtons(locale);

  const successEmbed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voice.reset.success"))
    .setDescription(t(locale, "commands.voice.reset.successDesc"))
    .setColor(Colors.Success);

  // Reply with success message
  await interaction.reply({
    embeds: [successEmbed],
    flags: MessageFlags.Ephemeral,
  });

  // Update the original dashboard message
  try {
    await interaction.message.edit({
      embeds: [embed],
      components: [buttons],
    });
  } catch (error) {
    console.error("Failed to update dashboard after reset:", error);
  }
}

/**
 * Handle Language select menu
 * 
 * Supports in-place pagination with NAV_NEXT and NAV_PREV options.
 * AUTO-SELECT LOGIC: When a Premium user changes language,
 * automatically select the first available Wavenet voice for that language
 * to prevent stale/invalid voice_name values.
 */
export async function handleLanguageSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const userId = interaction.user.id;
  const locale = getUserLocale(userId);
  const selectedValue = interaction.values[0];

  if (!selectedValue) {
    await interaction.reply({
      content: t(locale, "common.error"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // --- NAVIGATION LOGIC ---
  if (selectedValue === NAV_NEXT) {
    // User clicked "More Languages...", re-render UI showing Page 2
    // Do NOT update database
    const { embed, rows } = await buildConfigInterface(userId, locale, { languagePage: 2 });
    await interaction.update({
      embeds: [embed],
      components: rows,
    });
    return;
  }

  if (selectedValue === NAV_PREV) {
    // User clicked "Back to Top", re-render UI showing Page 1
    // Do NOT update database
    const { embed, rows } = await buildConfigInterface(userId, locale, { languagePage: 1 });
    await interaction.update({
      embeds: [embed],
      components: rows,
    });
    return;
  }

  // --- NORMAL SELECTION LOGIC ---
  // User picked a real language (e.g., 'vi-VN')
  const selectedLanguage = selectedValue;

  // Get current profile to check provider
  const currentProfile = getUserTTSProfile(userId);
  const isUserPremium = isPremiumUser(userId);

  // CAPABILITY CHECK: Does the NEW language support Wavenet?
  const supportsWavenet = await hasWavenetSupport(selectedLanguage);

  // Build the update object
  const updates: { language: string; provider?: "basic" | "premium"; voiceId?: string | null } = {
    language: selectedLanguage,
  };

  // AUTO-FALLBACK LOGIC:
  // If the new language doesn't support Wavenet, force Basic mode
  if (!supportsWavenet) {
    // Force downgrade to Basic for this language
    updates.provider = "basic";
    updates.voiceId = null;
  } else if (isUserPremium && currentProfile.provider === "premium") {
    // Language supports Wavenet AND user is in Encore mode
    // Auto-select first available voice
    try {
      const validVoices = await getWavenetVoicesByLanguage(selectedLanguage);

      if (validVoices.length > 0) {
        // Pick the first voice as safe default
        updates.voiceId = validVoices[0]?.value || null;
      } else {
        // Edge case: hasWavenetSupport returned true but no voices (shouldn't happen)
        updates.voiceId = null;
      }
    } catch (error) {
      console.error("Failed to fetch voices for auto-select:", error);
      // On error, clear the voice to prevent stale value
      updates.voiceId = null;
    }
  }

  // Update database
  setUserTTSProfile(userId, updates);

  // Rebuild the config interface with updated settings
  // Page is auto-detected from the newly selected language
  const { embed, rows } = await buildConfigInterface(userId, locale);

  const langInfo = getSupportedLanguageByCode(selectedLanguage);
  const langFlag = getLanguageFlag(selectedLanguage);
  const langName = langInfo ? langInfo.name : selectedLanguage;

  // Update the message
  await interaction.update({
    embeds: [
      embed.setFooter({
        text: t(locale, "commands.voice.config.languageUpdated", {
          language: `${langName}`,
        }),
      }),
    ],
    components: rows,
  });
}

/**
 * Handle Provider select menu
 */
export async function handleProviderSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const userId = interaction.user.id;
  const locale = getUserLocale(userId);
  const selectedProvider = interaction.values[0];

  if (!selectedProvider) {
    await interaction.reply({
      content: t(locale, "common.error"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // SECURITY CHECK: Validate premium access on server side
  if (selectedProvider === "premium" && !isPremiumUser(userId)) {
    await interaction.reply({
      content: t(locale, "commands.voice.config.encoreRequired"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update provider in database
  // If switching to basic, clear the voice ID
  if (selectedProvider === "basic") {
    setUserTTSProfile(userId, { provider: "basic", voiceId: null });
  } else {
    setUserTTSProfile(userId, { provider: selectedProvider as "basic" | "premium" });
  }

  // Rebuild the config interface with updated provider
  const { embed, rows } = await buildConfigInterface(userId, locale);

  const providerLabel =
    selectedProvider === "premium"
      ? t(locale, "commands.voice.config.providerPremiumLabel")
      : t(locale, "commands.voice.config.providerBasicLabel");

  // Update the message
  await interaction.update({
    embeds: [
      embed.setFooter({
        text: t(locale, "commands.voice.config.providerUpdated", {
          provider: providerLabel,
        }),
      }),
    ],
    components: rows,
  });
}

/**
 * Handle Variant select menu
 */
export async function handleVariantSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const userId = interaction.user.id;
  const locale = getUserLocale(userId);
  const selectedVariant = interaction.values[0];

  if (!selectedVariant || selectedVariant === "none") {
    await interaction.reply({
      content: t(locale, "common.error"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // SECURITY CHECK: Validate premium access on server side
  if (!isPremiumUser(userId)) {
    await interaction.reply({
      content: t(locale, "commands.voice.config.encoreRequired"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update voice ID in database
  setUserTTSProfile(userId, { voiceId: selectedVariant });

  // Rebuild the config interface
  const { embed, rows } = await buildConfigInterface(userId, locale);

  const variant = selectedVariant.split("-").pop() || "";

  // Update the message
  await interaction.update({
    embeds: [
      embed.setFooter({
        text: t(locale, "commands.voice.config.variantUpdated", {
          variant: `Wavenet ${variant}`,
        }),
      }),
    ],
    components: rows,
  });
}

/**
 * Main component interaction router
 */
export async function handleVoiceComponent(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
): Promise<void> {
  const customId = interaction.customId;

  try {
    // Button interactions
    if (interaction.isButton()) {
      if (customId === "btn_voice_config") {
        await handleConfigButton(interaction);
      } else if (customId === "btn_voice_reset") {
        await handleResetButton(interaction);
      }
    }
    // Select menu interactions
    else if (interaction.isStringSelectMenu()) {
      if (customId === "select_voice_language") {
        await handleLanguageSelect(interaction);
      } else if (customId === "select_voice_provider") {
        await handleProviderSelect(interaction);
      } else if (customId === "select_voice_variant") {
        await handleVariantSelect(interaction);
      }
    }
  } catch (error) {
    console.error(`Error handling voice component ${customId}:`, error);

    // Attempt to reply with error
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "An error occurred. Please try again.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {}
  }
}

/**
 * Check if an interaction is a voice settings component
 */
export function isVoiceComponent(customId: string): boolean {
  return (
    customId === "btn_voice_config" ||
    customId === "btn_voice_reset" ||
    customId === "select_voice_language" ||
    customId === "select_voice_provider" ||
    customId === "select_voice_variant"
  );
}
