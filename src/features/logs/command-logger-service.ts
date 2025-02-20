import type { ChatInputCommandInteraction } from "discord.js";
import type { Db } from "../../infra/db.ts";
import type { Logger } from "../../shared/logger.ts";
import { commandLogs, type CommandLogStatus } from "./schema.ts";

const MAX_BUFFER_SIZE = 1_000;
const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 2_000;

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
  readonly maxBufferSize?: number;
  readonly batchSize?: number;
  readonly flushIntervalMs?: number;
}

export class CommandLoggerService {
  private readonly db: Db;
  private readonly logger: Logger;
  private readonly maxBufferSize: number;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly buffer: CommandLogEntry[] = [];
  private inflightBatch: Promise<void> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private droppedSinceLastWarn = 0;
  private stopped = false;

  constructor(deps: CommandLoggerServiceDeps) {
    this.db = deps.db;
    this.logger = deps.logger.withTag("CMD_LOG");
    this.maxBufferSize = deps.maxBufferSize ?? MAX_BUFFER_SIZE;
    this.batchSize = deps.batchSize ?? BATCH_SIZE;
    this.flushIntervalMs = deps.flushIntervalMs ?? FLUSH_INTERVAL_MS;
    this.startFlushTimer();
  }

  log(entry: CommandLogEntry): void {
    if (this.stopped) return;
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift();
      this.droppedSinceLastWarn++;
      if (this.droppedSinceLastWarn === 1) {
        this.logger.warn(
          `command log buffer full (${this.maxBufferSize}); dropping oldest entries`,
        );
      }
    }
    this.buffer.push(entry);
    if (this.buffer.length >= this.batchSize) {
      void this.triggerFlush();
    }
  }

  async flush(timeoutMs = 5_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.buffer.length > 0 || this.inflightBatch) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      if (this.inflightBatch) {
        await Promise.race([
          this.inflightBatch,
          delay(Math.min(remaining, 1_000)),
        ]);
        continue;
      }
      await this.triggerFlush();
    }
    if (this.buffer.length > 0) {
      this.logger.warn(
        `flush timed out with ${this.buffer.length} command logs pending`,
      );
    }
  }

  shutdown(): void {
    this.stopped = true;
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
  }

  fromInteraction(
    interaction: ChatInputCommandInteraction,
    status: CommandLogStatus,
    model?: string | null,
  ): CommandLogEntry {
    const input: Record<string, unknown> = {};
    for (const opt of interaction.options.data) {
      if (opt.value === undefined) continue;
      input[opt.name] = opt.value;
    }
    const member = interaction.member;
    const displayName =
      member && "displayName" in member && typeof member.displayName === "string"
        ? member.displayName
        : member && "nickname" in member && typeof member.nickname === "string"
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

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) void this.triggerFlush();
    }, this.flushIntervalMs);
    if (typeof this.flushTimer.unref === "function") {
      this.flushTimer.unref();
    }
  }

  private async triggerFlush(): Promise<void> {
    if (this.inflightBatch) return this.inflightBatch;
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.batchSize);
    const task = this.persistBatch(batch).finally(() => {
      this.inflightBatch = null;
      if (this.droppedSinceLastWarn > 0 && this.buffer.length === 0) {
        this.logger.warn(
          `dropped ${this.droppedSinceLastWarn} command logs since last flush`,
        );
        this.droppedSinceLastWarn = 0;
      }
    });
    this.inflightBatch = task;
    return task;
  }

  private async persistBatch(batch: CommandLogEntry[]): Promise<void> {
    if (batch.length === 0) return;
    try {
      await this.db.insert(commandLogs).values(
        batch.map((entry) => ({
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
        })),
      );
    } catch (err) {
      this.logger.warn(
        `failed to persist batch of ${batch.length} command logs`,
        err,
      );
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const handle = setTimeout(resolve, ms);
    if (typeof handle.unref === "function") handle.unref();
  });
}
