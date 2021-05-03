import type { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export interface SlashCommand {
  readonly data: SlashCommandBuilder;
  execute(interaction: CommandInteraction): Promise<void>;
}
