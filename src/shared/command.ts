import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  StringSelectMenuInteraction,
} from "discord.js";

export type CommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  readonly data: CommandData;
  readonly selfLog?: boolean;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export type ComponentInteraction =
  | ButtonInteraction
  | StringSelectMenuInteraction;

export interface ComponentHandler {
  matches(customId: string): boolean;
  handle(interaction: ComponentInteraction): Promise<void>;
}
