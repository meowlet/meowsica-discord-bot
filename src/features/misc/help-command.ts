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

