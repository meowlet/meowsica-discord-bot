/**
 * CacheService - Smart Audio Caching with Hybrid Formats
 *
 * Implements intelligent caching for TTS audio files:
 * - MD5 hash-based file naming for deduplication
 * - Provider-aware file extensions (.ogg for Encore, .mp3 for Basic)
 * - Cache hits are free (no quota deduction)
 *
 * Cache Key: MD5(text + voice + speed + pitch + provider)
 * Path: cache/{hash}.{ext}
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { ttsLogger } from "../utils/logger.ts";

// ============================================================================
// Constants
// ============================================================================

const CACHE_DIR = "cache";

/** File extension for Encore (Google Cloud - OGG_OPUS) */
export const ENCORE_AUDIO_EXT = ".ogg";

/** File extension for Basic (Google Translate - MP3) */
export const BASIC_AUDIO_EXT = ".mp3";

/** Maximum cache size in bytes (500MB default) */
const MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024;

/** Maximum cache file age in milliseconds (7 days) */
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

export type CacheProvider = "basic" | "premium";

export interface CacheKey {
  text: string;
  voice: string | null;
  speed: number;
  pitch: number;
  provider: CacheProvider;
}

export interface CacheResult {
  hit: boolean;
  path: string;
  buffer?: Buffer;
}

export interface CacheStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  oldestFile: Date | null;
  newestFile: Date | null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate MD5 hash for cache key
 */
function generateCacheHash(key: CacheKey): string {
  const hashInput = [
    key.text,
    key.voice ?? "default",
    key.speed.toFixed(2),
    key.pitch.toFixed(2),
    key.provider,
  ].join("|");

  return createHash("md5").update(hashInput).digest("hex");
}

/**
 * Get file extension based on provider
 */
function getExtensionForProvider(provider: CacheProvider): string {
  return provider === "premium" ? ENCORE_AUDIO_EXT : BASIC_AUDIO_EXT;
}

/**
 * Get full cache file path
 */
function getCachePath(hash: string, provider: CacheProvider): string {
  const ext = getExtensionForProvider(provider);
  return join(CACHE_DIR, `${hash}${ext}`);
}

// ============================================================================
// CacheService Class
// ============================================================================

export class CacheService {
  private initialized = false;

  /**
   * Initialize the cache directory
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await mkdir(CACHE_DIR, { recursive: true });
      this.initialized = true;
      ttsLogger.info(`[CacheService] Initialized cache directory: ${CACHE_DIR}`);
    } catch (error) {
      ttsLogger.error("[CacheService] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Check if audio exists in cache
   *
   * @param key - Cache key parameters
   * @returns CacheResult with hit status and path
   */
  async check(key: CacheKey): Promise<CacheResult> {
    const hash = generateCacheHash(key);
    const path = getCachePath(hash, key.provider);

    try {
      const stats = await stat(path);
      if (stats.isFile()) {
        return { hit: true, path };
      }
    } catch {
      // File doesn't exist
    }

    return { hit: false, path };
  }

  /**
   * Get cached audio file
   *
   * @param key - Cache key parameters
   * @returns Buffer if cached, null otherwise
   */
  async get(key: CacheKey): Promise<Buffer | null> {
    const result = await this.check(key);

    if (result.hit) {
      try {
        const buffer = await readFile(result.path);
        ttsLogger.debug(`[CacheService] Cache hit: ${result.path}`);
        return buffer;
      } catch (error) {
        ttsLogger.warn(`[CacheService] Failed to read cached file: ${result.path}`, error);
      }
    }

    return null;
  }

  /**
   * Store audio in cache
   *
   * @param key - Cache key parameters
   * @param buffer - Audio data to cache
   * @returns Path to cached file
   */
  async set(key: CacheKey, buffer: Buffer): Promise<string> {
    const hash = generateCacheHash(key);
    const path = getCachePath(hash, key.provider);

    try {
      await writeFile(path, buffer);
      ttsLogger.debug(`[CacheService] Cached: ${path} (${buffer.length} bytes)`);
      return path;
    } catch (error) {
      ttsLogger.error(`[CacheService] Failed to cache file: ${path}`, error);
      throw error;
    }
  }

  /**
   * Get or generate audio with caching
   * This is the main entry point for cached TTS
   *
   * @param key - Cache key parameters
   * @param generator - Async function to generate audio if not cached
   * @returns Object with buffer, path, and whether it was a cache hit
   */
  async getOrGenerate(
    key: CacheKey,
    generator: () => Promise<Buffer | null>
  ): Promise<{ buffer: Buffer; path: string; fromCache: boolean } | null> {
    // Check cache first
    const cachedBuffer = await this.get(key);
    if (cachedBuffer) {
      const hash = generateCacheHash(key);
      const path = getCachePath(hash, key.provider);
      return { buffer: cachedBuffer, path, fromCache: true };
    }

    // Generate new audio
    const newBuffer = await generator();
    if (!newBuffer) {
      return null;
    }

    // Cache the result
    const path = await this.set(key, newBuffer);
    return { buffer: newBuffer, path, fromCache: false };
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const files = await readdir(CACHE_DIR);
      let totalSize = 0;
      let oldestMtime: Date | null = null;
      let newestMtime: Date | null = null;

      for (const file of files) {
        const filePath = join(CACHE_DIR, file);
        try {
          const stats = await stat(filePath);
          totalSize += stats.size;

          if (!oldestMtime || stats.mtime < oldestMtime) {
            oldestMtime = stats.mtime;
          }
          if (!newestMtime || stats.mtime > newestMtime) {
            newestMtime = stats.mtime;
          }
        } catch {
          // Skip files we can't stat
        }
      }

      return {
        totalFiles: files.length,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
        oldestFile: oldestMtime,
        newestFile: newestMtime,
      };
    } catch {
      return {
        totalFiles: 0,
        totalSizeBytes: 0,
        totalSizeMB: 0,
        oldestFile: null,
        newestFile: null,
      };
    }
  }

  /**
   * Clean up old cache files
   * Removes files older than MAX_CACHE_AGE_MS or when cache exceeds MAX_CACHE_SIZE_BYTES
   *
   * @returns Number of files removed
   */
  async cleanup(): Promise<number> {
    try {
      const files = await readdir(CACHE_DIR);
      const now = Date.now();
      let removed = 0;

      // First pass: remove old files
      const fileInfos: { path: string; mtime: Date; size: number }[] = [];

      for (const file of files) {
        const filePath = join(CACHE_DIR, file);
        try {
          const stats = await stat(filePath);
          const age = now - stats.mtime.getTime();

          if (age > MAX_CACHE_AGE_MS) {
            await unlink(filePath);
            removed++;
            ttsLogger.debug(`[CacheService] Removed old cache file: ${file}`);
          } else {
            fileInfos.push({ path: filePath, mtime: stats.mtime, size: stats.size });
          }
        } catch {
          // Skip files we can't process
        }
      }

      // Second pass: remove oldest files if cache is too large
      let totalSize = fileInfos.reduce((sum, f) => sum + f.size, 0);

      if (totalSize > MAX_CACHE_SIZE_BYTES) {
        // Sort by mtime (oldest first)
        fileInfos.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

        for (const fileInfo of fileInfos) {
          if (totalSize <= MAX_CACHE_SIZE_BYTES * 0.8) break; // Keep 20% buffer

          try {
            await unlink(fileInfo.path);
            totalSize -= fileInfo.size;
            removed++;
            ttsLogger.debug(`[CacheService] Removed cache file (size limit): ${fileInfo.path}`);
          } catch {
            // Skip files we can't remove
          }
        }
      }

      if (removed > 0) {
        ttsLogger.info(`[CacheService] Cleaned up ${removed} cache files`);
      }

      return removed;
    } catch (error) {
      ttsLogger.error("[CacheService] Cleanup failed:", error);
      return 0;
    }
  }

  /**
   * Clear all cached files
   * @returns Number of files removed
   */
  async clear(): Promise<number> {
    try {
      const files = await readdir(CACHE_DIR);
      let removed = 0;

      for (const file of files) {
        const filePath = join(CACHE_DIR, file);
        try {
          await unlink(filePath);
          removed++;
        } catch {
          // Skip files we can't remove
        }
      }

      ttsLogger.info(`[CacheService] Cleared ${removed} cache files`);
      return removed;
    } catch (error) {
      ttsLogger.error("[CacheService] Clear failed:", error);
      return 0;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let cacheServiceInstance: CacheService | null = null;

/**
 * Initialize the CacheService
 */
export async function initializeCacheService(): Promise<CacheService> {
  cacheServiceInstance = new CacheService();
  await cacheServiceInstance.initialize();
  return cacheServiceInstance;
}

/**
 * Get the CacheService instance
 * @throws Error if not initialized
 */
export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    throw new Error("CacheService not initialized. Call initializeCacheService first.");
  }
  return cacheServiceInstance;
}

/**
 * Helper function to build cache key from TTS parameters
 */
export function buildCacheKey(
  text: string,
  voice: string | null,
  speed: number,
  pitch: number,
  provider: CacheProvider
): CacheKey {
  return { text, voice, speed, pitch, provider };
}
