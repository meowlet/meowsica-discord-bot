import {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { t, type Locale } from "../../i18n/translate.ts";
import type { Command } from "../../shared/command.ts";
import { Colors } from "../../shared/colors.ts";
import { VoiceJoinError } from "../../shared/errors.ts";
import type { LocaleResolver } from "../settings/locale-resolver.ts";
import type { VoiceManager } from "./voice-manager.ts";

export interface JoinCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
}

export class JoinCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName(en.commands.join.name)
    .setDescription(en.commands.join.description)
    .setDescriptionLocalizations({ vi: vi.commands.join.description });

  private readonly localeResolver: LocaleResolver;
  private readonly voice: VoiceManager;

  constructor(deps: JoinCommandDeps) {
