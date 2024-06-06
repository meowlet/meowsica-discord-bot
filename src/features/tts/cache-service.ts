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
  }

  private maybeTriggerCleanup(): void {
    if (this.cleanupRunning) return;
    const now = Date.now();
    if (now - this.lastSizeCheckAt < SIZE_CHECK_INTERVAL_MS) return;
    if (this.currentSizeBytes < this.maxBytes) return;
    this.cleanup().catch((err) =>
      this.logger.warn("background cleanup failed", err),
    );
  }

  async stats(): Promise<CacheStats> {
    try {
      const files = await readdir(this.cacheDir);
      const infos = await this.batchStat(files);
      let totalSize = 0;
      let oldest: Date | null = null;
      let newest: Date | null = null;
      for (const info of infos) {
        totalSize += info.size;
        if (!oldest || info.mtime < oldest) oldest = info.mtime;
        if (!newest || info.mtime > newest) newest = info.mtime;
      }
      return {
        totalFiles: infos.length,
        totalSizeBytes: totalSize,
        oldestFile: oldest,
        newestFile: newest,
      };
    } catch {
      return {
        totalFiles: 0,
        totalSizeBytes: 0,
        oldestFile: null,
        newestFile: null,
      };
    }
  }

  async cleanup(): Promise<number> {
    if (this.cleanupRunning) return 0;
    this.cleanupRunning = true;
    try {
      return await this.runCleanup();
    } finally {
      this.cleanupRunning = false;
      this.lastSizeCheckAt = Date.now();
    }
  }

  private async runCleanup(): Promise<number> {
    let removed = 0;
    try {
      const files = await readdir(this.cacheDir);
      const infos = await this.batchStat(files);
      const now = Date.now();
      const survivors: FileInfo[] = [];
      for (const info of infos) {
        if (now - info.mtime.getTime() > this.maxAgeMs) {
          if (await this.unlinkSafe(info.path)) removed++;
          continue;
        }
        survivors.push(info);
      }
      let total = survivors.reduce((sum, f) => sum + f.size, 0);
      if (total > this.maxBytes) {
        survivors.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
        const target = this.maxBytes * CLEANUP_TARGET_RATIO;
        for (const file of survivors) {
          if (total <= target) break;
          if (await this.unlinkSafe(file.path)) {
            total -= file.size;
            removed++;
          }
        }
      }
      this.currentSizeBytes = total;
      if (removed > 0) {
        this.logger.info(
          `cleaned ${removed} cache files (${total} bytes remaining)`,
        );
      }
    } catch (err) {
      this.logger.error("cleanup failed", err);
    }
    return removed;
  }

  private async computeOnDiskSize(): Promise<number> {
    try {
      const files = await readdir(this.cacheDir);
      const infos = await this.batchStat(files);
      return infos.reduce((sum, f) => sum + f.size, 0);
    } catch {
      return 0;
    }
  }

  private async batchStat(files: readonly string[]): Promise<FileInfo[]> {
    const result: FileInfo[] = [];
    for (let i = 0; i < files.length; i += STAT_BATCH_SIZE) {
      const slice = files.slice(i, i + STAT_BATCH_SIZE);
      const settled = await Promise.allSettled(
        slice.map(async (file) => {
          const path = join(this.cacheDir, file);
          const info = await stat(path);
          return { path, mtime: info.mtime, size: info.size };
        }),
      );
      for (const entry of settled) {
        if (entry.status === "fulfilled") result.push(entry.value);
      }
    }
    return result;
  }

  private async sizeOf(path: string): Promise<number> {
    try {
      const info = await stat(path);
      return info.size;
    } catch {
      return 0;
    }
  }

  private async unlinkSafe(path: string): Promise<boolean> {
    try {
      await unlink(path);
      return true;
    } catch {
      return false;
    }
  }

  private pathFor(key: CacheKey): string {
    const hash = createHash("md5")
      .update(
        [
          key.text,
          key.voice ?? "default",
          key.speed.toFixed(2),
          key.pitch.toFixed(2),
          key.provider,
        ].join("|"),
      )
      .digest("hex");
    const ext =
      key.provider === "wavenet" ? WAVENET_AUDIO_EXT : BASIC_AUDIO_EXT;
    return join(this.cacheDir, `${hash}${ext}`);
  }
}
