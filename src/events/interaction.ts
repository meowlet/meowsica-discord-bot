import {
  type Interaction,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  MessageFlags,
} from "discord.js";
import type { BotClient } from "../structs/BotClient.ts";
import { commands } from "../commands.ts";
import { commandLogger } from "../utils/logger.ts";
import {
  isVoiceComponent,
  handleVoiceComponent,
} from "../components/voice-settings.ts";
import {
  isLanguageComponent,
  handleLanguageComponent,
} from "../components/language-settings.ts";
import { t, DEFAULT_LOCALE, type Locale } from "../i18n/index.ts";
import { getLocale, getUserLocale as getDbUserLocale } from "../settings/db.ts";

/**
 * Get user's locale preference (for non-command interactions)
 */
function getUserLocale(userId: string): Locale {
  return getDbUserLocale(userId) || DEFAULT_LOCALE;
}

const commandMap = new Map(commands.map((cmd) => [cmd.data.name, cmd]));

export async function handleInteraction(
  client: BotClient,
  interaction: Interaction,
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    await handleCommand(client, interaction);
  } else if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
  } else if (interaction.isButton() || interaction.isStringSelectMenu()) {
    await handleComponent(interaction);
  }
}

async function handleCommand(
  client: BotClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const command = commandMap.get(interaction.commandName);
  const locale = getLocale(interaction);

  if (!command) {
    commandLogger.warn(`Command not found: ${interaction.commandName}`);
    await interaction.reply({
      content: t(locale, "common.unknownCommand"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    commandLogger.info(`/${interaction.commandName} by ${interaction.user.tag}`);
    await command.execute(interaction);
  } catch (error) {
    commandLogger.error(`Error executing /${interaction.commandName}:`, error);

    // Don't try to respond if it's already an interaction acknowledgment error
    const isAcknowledgeError = error instanceof Error && 
      (error.message.includes("already been acknowledged") || 
       error.message.includes("Unknown interaction"));
    
    if (isAcknowledgeError) {
      return; // Silently ignore - user already got a response or interaction expired
    }

    const errorMessage = t(locale, "common.commandError");

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {
      // Ignore errors when trying to respond - interaction may have expired
    }
  }
}

async function handleAutocomplete(
  interaction: AutocompleteInteraction,
): Promise<void> {
  const command = commandMap.get(interaction.commandName);

  if (!command || !command.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    commandLogger.error(
      `Error in autocomplete for /${interaction.commandName}:`,
      error,
    );
  }
}

/**
 * Handle button and select menu component interactions
 */
async function handleComponent(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
): Promise<void> {
  const customId = interaction.customId;
  const locale = getUserLocale(interaction.user.id);

  try {
    // Route voice settings components
    if (isVoiceComponent(customId)) {
      await handleVoiceComponent(interaction);
      return;
    }

    // Route language settings components
    if (isLanguageComponent(customId)) {
      await handleLanguageComponent(interaction);
      return;
    }

    // Unknown component - log and ignore
    commandLogger.warn(`Unknown component interaction: ${customId}`);
  } catch (error) {
    commandLogger.error(`Error handling component ${customId}:`, error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: t(locale, "common.errorRetry"),
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
