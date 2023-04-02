import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import type { Logger } from "../../shared/logger.ts";
import type { TtsProvider } from "./types.ts";

const WAVENET_AUDIO_EXT = ".ogg";
const BASIC_AUDIO_EXT = ".mp3";
const DEFAULT_MAX_BYTES = 500 * 1024 * 1024;
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const STAT_BATCH_SIZE = 32;
const SIZE_CHECK_INTERVAL_MS = 60_000;
const CLEANUP_TARGET_RATIO = 0.8;

export interface CacheKey {
  readonly text: string;
  readonly voice: string | null;
  readonly speed: number;
  readonly pitch: number;
  readonly provider: TtsProvider;
}

export interface CacheStats {
  readonly totalFiles: number;
  readonly totalSizeBytes: number;
  readonly oldestFile: Date | null;
  readonly newestFile: Date | null;
}

export interface TtsCacheServiceDeps {
  readonly logger: Logger;
  readonly cacheDir?: string;
  readonly maxBytes?: number;
  readonly maxAgeMs?: number;
  readonly shardId?: number | null;
}

interface FileInfo {
  readonly path: string;
  readonly mtime: Date;
  readonly size: number;
}

export class TtsCacheService {
  private readonly logger: Logger;
  private readonly cacheDir: string;
  private readonly maxBytes: number;
  private readonly maxAgeMs: number;
  private initialized = false;
  private cleanupRunning = false;
  private currentSizeBytes = 0;
  private lastSizeCheckAt = 0;

  constructor(deps: TtsCacheServiceDeps) {
    this.logger = deps.logger.withTag("CACHE");
    const base = deps.cacheDir ?? "cache";
    this.cacheDir =
      deps.shardId !== null && deps.shardId !== undefined
        ? join(base, `shard-${deps.shardId}`)
        : base;
    this.maxBytes = deps.maxBytes ?? DEFAULT_MAX_BYTES;
    this.maxAgeMs = deps.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await mkdir(this.cacheDir, { recursive: true });
    this.currentSizeBytes = await this.computeOnDiskSize();
    this.initialized = true;
    this.logger.info(
      `cache directory ready: ${this.cacheDir} (${this.currentSizeBytes} bytes)`,
    );
  }

  async get(key: CacheKey): Promise<Buffer | null> {
    const path = this.pathFor(key);
    try {
      const info = await stat(path);
      if (!info.isFile()) return null;
      return await readFile(path);
    } catch {
      return null;
    }
  }

  async set(key: CacheKey, buffer: Buffer): Promise<string> {
    const path = this.pathFor(key);
    const previousSize = await this.sizeOf(path);
    await writeFile(path, buffer);
    this.currentSizeBytes += buffer.length - previousSize;
    this.logger.debug(`stored ${path} (${buffer.length} bytes)`);
    this.maybeTriggerCleanup();
    return path;
