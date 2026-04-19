import {
  type InteractionContextService,
  interactionContext as defaultInteractionContext,
} from "./interaction-context.ts";

export type LogLevel = "error" | "warn" | "info" | "debug";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: "\x1b[31m",
  warn: "\x1b[33m",
  info: "\x1b[36m",
  debug: "\x1b[90m",
} as const;

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export interface LoggerOptions {
  readonly tag: string;
  readonly level: LogLevel;
  readonly jsonMode: boolean;
  readonly context?: InteractionContextService;
}

interface JsonLogRecord {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  pid: number;
  shardId?: number;
  guildId?: string;
  userId?: string;
  command?: string;
  stack?: string;
  [key: string]: unknown;
}

export class Logger {
  private readonly tag: string;
  private readonly level: LogLevel;
  private readonly jsonMode: boolean;
  private readonly context: InteractionContextService;

  constructor(options: LoggerOptions) {
    this.tag = options.tag;
    this.level = options.level;
    this.jsonMode = options.jsonMode;
    this.context = options.context ?? defaultInteractionContext;
  }

  info(message: string, ...args: unknown[]): void {
    this.emit("info", message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.emit("warn", message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.emit("error", message, args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.emit("debug", message, args);
  }

  withTag(tag: string): Logger {
    return new Logger({
      tag,
      level: this.level,
      jsonMode: this.jsonMode,
      context: this.context,
    });
  }

  private emit(level: LogLevel, message: string, args: unknown[]): void {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) return;
    if (this.jsonMode) {
      this.emitJson(level, message, args);
      return;
    }
    this.emitPretty(level, message, args);
  }

  private emitJson(level: LogLevel, message: string, args: unknown[]): void {
    const store = this.context.get();
    const { extras, stack } = partitionArgs(args);
    const record: JsonLogRecord = {
      timestamp: new Date().toISOString(),
      level,
      context: this.tag,
      message,
      pid: process.pid,
    };
    if (store) {
      if (store.shardId !== undefined) record.shardId = store.shardId;
      if (store.guildId) record.guildId = store.guildId;
      if (store.userId) record.userId = store.userId;
      if (store.command) record.command = store.command;
    }
    if (stack) record.stack = stack;
    if (extras) Object.assign(record, extras);
    const line = JSON.stringify(record);
    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }

  private emitPretty(level: LogLevel, message: string, args: unknown[]): void {
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const color = LEVEL_COLORS[level];
    const tag = `${BOLD}[${this.tag}]${RESET}`;
    const lvl = `${color}${level.toUpperCase().padEnd(5)}${RESET}`;
    const store = this.context.get();
    const ctxParts: string[] = [];
    if (store?.guildId) ctxParts.push(`guild=${store.guildId}`);
    if (store?.userId) ctxParts.push(`user=${store.userId}`);
    if (store?.command) ctxParts.push(`cmd=${store.command}`);
    const ctxSuffix =
      ctxParts.length > 0 ? ` ${BOLD}(${ctxParts.join(" ")})${RESET}` : "";
    const line = [time, lvl, tag, message + ctxSuffix].join(" ");
    const stream = level === "error" ? process.stderr : process.stdout;
    stream.write(line + "\n");
    for (const arg of args) {
      if (arg instanceof Error) {
        stream.write(`  ${color}${arg.stack ?? arg.message}${RESET}\n`);
      } else if (arg !== undefined && arg !== null && typeof arg !== "string") {
        stream.write(`  ${String(arg)}\n`);
      }
    }
  }
}

function partitionArgs(args: unknown[]): {
  extras?: Record<string, unknown>;
  stack?: string;
} {
  let stack: string | undefined;
  let extras: Record<string, unknown> | undefined;
  for (const arg of args) {
    if (arg instanceof Error) {
      stack = arg.stack ?? arg.message;
      if (!extras) extras = {};
      extras.errorName = arg.name;
      extras.errorMessage = arg.message;
    } else if (arg && typeof arg === "object" && !Array.isArray(arg)) {
      extras = { ...(extras ?? {}), ...(arg as Record<string, unknown>) };
    }
  }
  return { extras, stack };
}

export interface CreateLoggerParams {
  readonly level: LogLevel;
  readonly jsonMode: boolean;
  readonly context?: InteractionContextService;
}

export function createRootLogger(params: CreateLoggerParams): Logger {
  return new Logger({
    tag: "APP",
    level: params.level,
    jsonMode: params.jsonMode,
    context: params.context,
  });
}
