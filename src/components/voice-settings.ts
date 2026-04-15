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
} from "../commands/misc/voice.ts";
import { voiceLogger } from "../utils/logger.ts";

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
 * All users can choose between Basic and Encore.
 * CAPABILITY CHECK: If language doesn't support Wavenet, hide Encore option.
 */
function buildProviderSelect(
  currentProvider: string,
  supportsWavenet: boolean,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options: StringSelectMenuOptionBuilder[] = [
    new StringSelectMenuOptionBuilder()
      .setLabel(t(locale, "commands.voice.config.providerBasicLabel"))
      .setDescription(t(locale, "commands.voice.config.providerBasicDesc"))
      .setValue("basic")
      .setDefault(currentProvider === "basic" || !supportsWavenet),
  ];

  if (supportsWavenet) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(t(locale, "commands.voice.config.providerEncoreLabel"))
        .setDescription(t(locale, "commands.voice.config.providerEncoreDesc"))
        .setValue("premium")
        .setDefault(currentProvider === "premium"),
    );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("select_voice_provider")
    .setPlaceholder(
      supportsWavenet
        ? t(locale, "commands.voice.config.providerPlaceholder")
        : t(locale, "commands.voice.config.providerBasicOnly"),
    )
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Build variant/model select menu
 * 
 * Enabled when user has selected 'premium' provider
 */
async function buildVariantSelect(
  currentProvider: string,
  currentLanguage: string | null,
  currentVoiceId: string | null,
  locale: Locale,
): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
  const isEncoreMode = currentProvider === "premium";
  const langCode = currentLanguage || "vi-VN";

  let options: StringSelectMenuOptionBuilder[] = [];

  if (isEncoreMode) {
    try {
      const voices = await getWavenetVoicesByLanguage(langCode);
      if (voices.length > 0) {
        options = voices.slice(0, 25).map((voice) => {
          const variant = voice.value.split("-").pop() || "";
          const genderLabel = voice.gender === "FEMALE" 
            ? t(locale, "common.gender.female") 
            : voice.gender === "MALE" 
              ? t(locale, "common.gender.male") 
              : t(locale, "common.gender.neutral");
          return new StringSelectMenuOptionBuilder()
            .setLabel(`Wavenet ${variant}`)
            .setDescription(genderLabel)
            .setValue(voice.value)
            .setDefault(voice.value === currentVoiceId);
        });
      }
    } catch (error) {
      voiceLogger.error("Failed to fetch Wavenet voices:", error as Error);
    }
  }

  if (options.length === 0) {
    const description = currentProvider !== "premium"
      ? t(locale, "commands.voice.config.variantBasicMode")
      : t(locale, "commands.voice.config.variantNoVoices");

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
    .setDisabled(!isEncoreMode);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Config interface state for pagination
 */
interface ConfigState {
  languagePage?: number;
}

/**
 * Speed options for Basic provider (Binary: Normal or Slow)
 * The "magic number" 0.25 is used to detect Slow Mode in the database
 * (0.25 is the minimum allowed by the DB constraint)
 */
const BASIC_SPEED_OPTIONS = [
  { label: "speedNormal", value: "1.0", description: "speedNormalDesc" },
  { label: "speedSlow", value: "0.25", description: "speedSlowDesc" },
] as const;

/**
 * Speed options for Premium (Encore) provider
 * Full granular control: 0.25x to 4.0x
 */
const PREMIUM_SPEED_OPTIONS = [
  { label: "speed025x", value: "0.25" },
  { label: "speed05x", value: "0.5" },
  { label: "speed075x", value: "0.75" },
  { label: "speed10x", value: "1.0" },
  { label: "speed125x", value: "1.25" },
  { label: "speed15x", value: "1.5" },
  { label: "speed20x", value: "2.0" },
  { label: "speed30x", value: "3.0" },
  { label: "speed40x", value: "4.0" },
] as const;

/**
 * Pitch options for Premium (Encore) provider
 * Range: -20.0 to +20.0 (we offer preset values)
 */
const PITCH_OPTIONS = [
  { label: "pitchDeep", value: "-5.0", description: "pitchDeepDesc" },
  { label: "pitchMediumLow", value: "-2.5", description: "pitchMediumLowDesc" },
  { label: "pitchNormal", value: "0.0", description: "pitchNormalDesc" },
  { label: "pitchMediumHigh", value: "2.5", description: "pitchMediumHighDesc" },
  { label: "pitchHigh", value: "5.0", description: "pitchHighDesc" },
] as const;

/**
 * Build speed select menu
 * 
 * Dynamic options based on provider:
 * - Basic: Normal (1.0) or Slow (0.24) only
 * - Premium: Full range from 0.25x to 4.0x
 */
function buildSpeedSelect(
  currentSpeed: number,
  isPremiumProvider: boolean,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = isPremiumProvider ? PREMIUM_SPEED_OPTIONS : BASIC_SPEED_OPTIONS;
  
  const selectOptions = options.map((opt) => {
    const optionBuilder = new StringSelectMenuOptionBuilder()
      .setLabel(t(locale, `commands.voice.config.${opt.label}`))
      .setValue(opt.value);
    
    // Add description if available
    if ("description" in opt && opt.description) {
      optionBuilder.setDescription(t(locale, `commands.voice.config.${opt.description}`));
    }
    
    // For Basic provider, mark as default based on threshold (<= 0.25 = Slow)
    if (!isPremiumProvider) {
      const isSlowMode = currentSpeed <= 0.25;
      const isThisSlowOption = opt.value === "0.25";
      optionBuilder.setDefault(isSlowMode === isThisSlowOption);
    } else {
      // For Premium, match exact value (with some tolerance for float comparison)
      const optValue = parseFloat(opt.value);
      optionBuilder.setDefault(Math.abs(currentSpeed - optValue) < 0.01);
    }
    
    return optionBuilder;
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId("select_voice_speed")
    .setPlaceholder(t(locale, "commands.voice.config.speedPlaceholder"))
    .addOptions(selectOptions);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Build pitch select menu (Premium/Encore only)
 * 
 * Only rendered when user is in Encore mode
 */
function buildPitchSelect(
  currentPitch: number,
  locale: Locale,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const selectOptions = PITCH_OPTIONS.map((opt) => {
    const optValue = parseFloat(opt.value);
    return new StringSelectMenuOptionBuilder()
      .setLabel(t(locale, `commands.voice.config.${opt.label}`))
      .setDescription(t(locale, `commands.voice.config.${opt.description}`))
      .setValue(opt.value)
      .setDefault(Math.abs(currentPitch - optValue) < 0.01);
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId("select_voice_pitch")
    .setPlaceholder(t(locale, "commands.voice.config.pitchPlaceholder"))
    .addOptions(selectOptions);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Build complete config interface
 * 
 * Shows all voice settings with full feature access:
 * - Shows variant row when provider is 'premium' AND language supports Wavenet
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
  const profile = getUserTTSProfile(userId);

  const langCode = profile.language || "vi-VN";
  const supportsWavenet = await hasWavenetSupport(langCode);

  const effectiveProvider = supportsWavenet ? profile.provider : "basic";

  const embed = new EmbedBuilder()
    .setTitle(t(locale, "commands.voice.config.title"))
    .setDescription(t(locale, "commands.voice.config.subtitle"))
    .setColor(Colors.Primary);

  if (!supportsWavenet) {
    embed.setFooter({
      text: t(locale, "commands.voice.config.noWavenetForLanguage"),
    });
  }

  const languagePage = state.languagePage ?? getLanguagePage(profile.language);
  const languageRow = buildLanguageSelect(profile.language, locale, languagePage);
  const providerRow = buildProviderSelect(effectiveProvider, supportsWavenet, locale);

  const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [languageRow, providerRow];

  const isEncoreMode = effectiveProvider === "premium" && supportsWavenet;
  if (isEncoreMode) {
    const variantRow = await buildVariantSelect(
      effectiveProvider,
      profile.language,
      profile.voiceId,
      locale,
    );
    rows.push(variantRow);
  }

  const speedRow = buildSpeedSelect(profile.speed, isEncoreMode, locale);
  rows.push(speedRow);

  if (isEncoreMode) {
    const pitchRow = buildPitchSelect(profile.pitch, locale);
    rows.push(pitchRow);
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
  const buttonClickerId = interaction.user.id;
  const locale = getUserLocale(buttonClickerId);

  // OWNERSHIP CHECK: Verify the button clicker is the original dashboard owner
  const originalOwnerId = interaction.message.interaction?.user.id;
  if (!originalOwnerId) {
    // Message doesn't have interaction metadata (edge case)
    await interaction.reply({
      content: t(locale, "commands.voice.reset.notOwner"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (buttonClickerId !== originalOwnerId) {
    // User B clicked Reset on User A's dashboard - deny access
    await interaction.reply({
      content: t(locale, "commands.voice.reset.notOwner"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Ownership verified - proceed with reset using original owner's ID
  const userId = originalOwnerId;
  const ownerLocale = getUserLocale(userId);

  // Reset to defaults
  resetUserToBasicVoice(userId);

  // Update the dashboard embed with original owner's data
  const embed = buildVoiceDashboardEmbed(userId, ownerLocale);
  const buttons = buildDashboardButtons(ownerLocale);

  const successEmbed = new EmbedBuilder()
    .setTitle(t(ownerLocale, "commands.voice.reset.success"))
    .setDescription(t(ownerLocale, "commands.voice.reset.successDesc"))
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
    voiceLogger.error("Failed to update dashboard after reset:", error as Error);
  }
}

/**
 * Handle Language select menu
 * 
 * Supports in-place pagination with NAV_NEXT and NAV_PREV options.
 * 
 * AUTO-UPGRADE/DOWNGRADE LOGIC for Premium Users:
 * - If new language supports Wavenet → Force provider to 'premium' + auto-select first voice
 * - If new language doesn't support Wavenet → Force provider to 'basic' + clear voice
 * 
 * This ensures Premium users always get the best available experience
 * without needing to manually switch providers.
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
  const selectedLanguage = selectedValue;

  const supportsWavenet = await hasWavenetSupport(selectedLanguage);

  const updates: { language: string; provider?: "basic" | "premium"; voiceId?: string | null } = {
    language: selectedLanguage,
  };

  if (supportsWavenet) {
    updates.provider = "premium";
    try {
      const validVoices = await getWavenetVoicesByLanguage(selectedLanguage);
      if (validVoices.length > 0) {
        updates.voiceId = validVoices[0]?.value || null;
      } else {
        updates.voiceId = null;
      }
    } catch (error) {
      voiceLogger.error("Failed to fetch voices for auto-select:", error as Error);
      updates.voiceId = null;
    }
  } else {
    updates.provider = "basic";
    updates.voiceId = null;
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
 * 
 * AUTO-SELECT LOGIC: When switching to Premium (Encore),
 * automatically select the first available Wavenet voice for the user's
 * current language to prevent stale/invalid voice_name values.
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

  // Get current profile to access user's language
  const currentProfile = getUserTTSProfile(userId);

  // Build the update object
  const updates: { provider: "basic" | "premium"; voiceId?: string | null } = {
    provider: selectedProvider as "basic" | "premium",
  };

  if (selectedProvider === "basic") {
    // Switching to Basic -> Clear the voice model
    updates.voiceId = null;
  } else {
    // Switching to Premium (Encore) -> Auto-select first available voice
    const currentLang = currentProfile.language || "vi-VN";
    
    try {
      const validVoices = await getWavenetVoicesByLanguage(currentLang);
      
      if (validVoices.length > 0) {
        // Pick the first voice as safe default
        updates.voiceId = validVoices[0]?.value || null;
      } else {
        // Language has no Wavenet support - clear voice
        updates.voiceId = null;
      }
    } catch (error) {
      voiceLogger.error("Failed to fetch voices for auto-select on provider change:", error as Error);
      // On error, clear the voice to prevent stale value
      updates.voiceId = null;
    }
  }

  // Update database with provider AND voice in one call
  setUserTTSProfile(userId, updates);

  // Rebuild the config interface with updated provider
  const { embed, rows } = await buildConfigInterface(userId, locale);

  const providerLabel =
    selectedProvider === "premium"
      ? t(locale, "commands.voice.config.providerEncoreLabel")
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
 * Handle Speed select menu
 * 
 * Works for both Basic and Premium providers:
 * - Basic: Normal (1.0) or Slow (0.24) - binary choice
 * - Premium: Full range 0.25x to 4.0x
 */
export async function handleSpeedSelect(
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

  // Parse the selected speed value
  const speed = parseFloat(selectedValue);
  if (isNaN(speed)) {
    await interaction.reply({
      content: t(locale, "common.error"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update speed in database
  setUserTTSProfile(userId, { speed });

  // Rebuild the config interface
  const { embed, rows } = await buildConfigInterface(userId, locale);

  // Determine speed label for feedback
  let speedLabel: string;
  if (speed < 0.5) {
    // Basic "Slow Mode"
    speedLabel = t(locale, "commands.voice.config.speedSlow");
  } else if (Math.abs(speed - 1.0) < 0.01) {
    speedLabel = t(locale, "commands.voice.config.speedNormal");
  } else {
    speedLabel = `${speed}x`;
  }

  // Update the message
  await interaction.update({
    embeds: [
      embed.setFooter({
        text: t(locale, "commands.voice.config.speedUpdated", {
          speed: speedLabel,
        }),
      }),
    ],
    components: rows,
  });
}

/**
 * Handle Pitch select menu (Premium/Encore only)
 */
export async function handlePitchSelect(
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

  const pitch = parseFloat(selectedValue);
  if (isNaN(pitch)) {
    await interaction.reply({
      content: t(locale, "common.error"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update pitch in database
  setUserTTSProfile(userId, { pitch });

  // Rebuild the config interface
  const { embed, rows } = await buildConfigInterface(userId, locale);

  // Determine pitch label for feedback
  let pitchLabel: string;
  if (pitch < -2.5) {
    pitchLabel = t(locale, "commands.voice.config.pitchDeep");
  } else if (pitch < 0) {
    pitchLabel = t(locale, "commands.voice.config.pitchMediumLow");
  } else if (Math.abs(pitch) < 0.01) {
    pitchLabel = t(locale, "commands.voice.config.pitchNormal");
  } else if (pitch < 5) {
    pitchLabel = t(locale, "commands.voice.config.pitchMediumHigh");
  } else {
    pitchLabel = t(locale, "commands.voice.config.pitchHigh");
  }

  // Update the message
  await interaction.update({
    embeds: [
      embed.setFooter({
        text: t(locale, "commands.voice.config.pitchUpdated", {
          pitch: pitchLabel,
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
  const locale = getUserLocale(interaction.user.id);

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
      } else if (customId === "select_voice_speed") {
        await handleSpeedSelect(interaction);
      } else if (customId === "select_voice_pitch") {
        await handlePitchSelect(interaction);
      }
    }
  } catch (error) {
    voiceLogger.error(`Error handling voice component ${customId}:`, error as Error);

    // Attempt to reply with error
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: t(locale, "common.errorRetry"),
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
    customId === "select_voice_variant" ||
    customId === "select_voice_speed" ||
    customId === "select_voice_pitch"
  );
}
