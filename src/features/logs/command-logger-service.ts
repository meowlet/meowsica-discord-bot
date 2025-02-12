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
