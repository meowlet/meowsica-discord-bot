import type { CommandInteraction, PermissionResolvable, SlashCommandBuilder } from 'discord.js';

export interface SlashCommand {
  readonly data: SlashCommandBuilder;
  readonly requiredPermissions?: PermissionResolvable[];
  execute(interaction: CommandInteraction): Promise<void>;
}
