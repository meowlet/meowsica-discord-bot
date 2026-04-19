import type { ChatInputCommandInteraction } from "discord.js";
import type { Db } from "../../infra/db.ts";
import type { Logger } from "../../shared/logger.ts";
import { commandLogs, type CommandLogStatus } from "./schema.ts";

export interface CommandLogEntry {
  readonly userId: string;
  readonly username: string;
  readonly displayName?: string | null;
  readonly guildId?: string | null;
  readonly guildName?: string | null;
  readonly channelId?: string | null;
  readonly command: string;
  readonly input?: Record<string, unknown> | null;
  readonly model?: string | null;
  readonly status: CommandLogStatus;
}

export interface CommandLoggerServiceDeps {
  readonly db: Db;
  readonly logger: Logger;
}

export class CommandLoggerService {
  private readonly db: Db;
  private readonly logger: Logger;

  constructor(deps: CommandLoggerServiceDeps) {
    this.db = deps.db;
    this.logger = deps.logger.withTag("CMD_LOG");
  }

  log(entry: CommandLogEntry): void {
    queueMicrotask(() => {
      this.persist(entry).catch((err) => {
        this.logger.warn("failed to persist command log", err);
      });
    });
  }

  fromInteraction(
    interaction: ChatInputCommandInteraction,
    status: CommandLogStatus,
    model?: string | null,
  ): CommandLogEntry {
    const input: Record<string, unknown> = {};
    for (const opt of interaction.options.data) {
      if (opt.value !== undefined) input[opt.name] = opt.value;
    }
    const member = interaction.member as
      | { displayName?: string; nickname?: string }
      | null
      | undefined;
    const displayName =
      typeof member?.displayName === "string"
        ? member.displayName
        : typeof member?.nickname === "string"
          ? member.nickname
          : null;
    return {
      userId: interaction.user.id,
      username: interaction.user.username,
      displayName,
      guildId: interaction.guild?.id ?? null,
      guildName: interaction.guild?.name ?? null,
      channelId: interaction.channelId,
      command: interaction.commandName,
      input: Object.keys(input).length > 0 ? input : null,
      model: model ?? null,
      status,
    };
  }

  private async persist(entry: CommandLogEntry): Promise<void> {
    await this.db.insert(commandLogs).values({
      userId: entry.userId,
      username: entry.username,
      displayName: entry.displayName ?? null,
      guildId: entry.guildId ?? null,
      guildName: entry.guildName ?? null,
      channelId: entry.channelId ?? null,
      command: entry.command,
      input: entry.input ?? null,
      model: entry.model ?? null,
      status: entry.status,
    });
  }
}
