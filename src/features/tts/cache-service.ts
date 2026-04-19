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
}

export class TtsCacheService {
  private readonly logger: Logger;
  private readonly cacheDir: string;
  private readonly maxBytes: number;
  private readonly maxAgeMs: number;
  private initialized = false;

  constructor(deps: TtsCacheServiceDeps) {
    this.logger = deps.logger.withTag("CACHE");
    this.cacheDir = deps.cacheDir ?? "cache";
    this.maxBytes = deps.maxBytes ?? DEFAULT_MAX_BYTES;
    this.maxAgeMs = deps.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await mkdir(this.cacheDir, { recursive: true });
    this.initialized = true;
    this.logger.info(`cache directory ready: ${this.cacheDir}`);
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
    await writeFile(path, buffer);
    this.logger.debug(`stored ${path} (${buffer.length} bytes)`);
    return path;
  }

  async stats(): Promise<CacheStats> {
    try {
      const files = await readdir(this.cacheDir);
      let totalSize = 0;
      let oldest: Date | null = null;
      let newest: Date | null = null;
      for (const file of files) {
        try {
          const info = await stat(join(this.cacheDir, file));
          totalSize += info.size;
          if (!oldest || info.mtime < oldest) oldest = info.mtime;
          if (!newest || info.mtime > newest) newest = info.mtime;
        } catch {
          continue;
        }
      }
      return {
        totalFiles: files.length,
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
    let removed = 0;
    try {
      const files = await readdir(this.cacheDir);
      const now = Date.now();
      const survivors: { path: string; mtime: Date; size: number }[] = [];
      for (const file of files) {
        const path = join(this.cacheDir, file);
        try {
          const info = await stat(path);
          if (now - info.mtime.getTime() > this.maxAgeMs) {
            await unlink(path);
            removed++;
            continue;
          }
          survivors.push({ path, mtime: info.mtime, size: info.size });
        } catch {
          continue;
        }
      }
      let total = survivors.reduce((sum, f) => sum + f.size, 0);
      if (total > this.maxBytes) {
        survivors.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
        const target = this.maxBytes * 0.8;
        for (const file of survivors) {
          if (total <= target) break;
          try {
            await unlink(file.path);
            total -= file.size;
            removed++;
          } catch {
            continue;
          }
        }
      }
      if (removed > 0) {
        this.logger.info(`cleaned ${removed} cache files`);
      }
    } catch (err) {
      this.logger.error("cleanup failed", err);
    }
    return removed;
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
