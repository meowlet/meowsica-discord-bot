import {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { t } from "../../i18n/translate.ts";
import type { Command } from "../../shared/command.ts";
import { Colors } from "../../shared/colors.ts";
import type { LocaleResolver } from "../settings/locale-resolver.ts";
import type { VoiceManager } from "./voice-manager.ts";

export interface LeaveCommandDeps {
  readonly localeResolver: LocaleResolver;
  readonly voice: VoiceManager;
}

export class LeaveCommand implements Command {
  readonly data = new SlashCommandBuilder()
    .setName(en.commands.leave.name)
    .setDescription(en.commands.leave.description)
    .setDescriptionLocalizations({ vi: vi.commands.leave.description });

  private readonly localeResolver: LocaleResolver;
  private readonly voice: VoiceManager;

  constructor(deps: LeaveCommandDeps) {
    this.localeResolver = deps.localeResolver;
