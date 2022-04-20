import type {
  ChatInputCommandInteraction,
  PermissionResolvable,
  SlashCommandBuilder,
} from 'discord.js';

export interface SlashCommand {
  readonly data: SlashCommandBuilder;
  readonly requiredPermissions?: PermissionResolvable[];
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface ComponentHandler {
  readonly customIdPrefix: string;
  handle(interaction: unknown): Promise<void>;
}
