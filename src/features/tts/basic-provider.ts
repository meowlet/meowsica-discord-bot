import type { Logger } from "../../shared/logger.ts";
import { buildTranslateTtsUrl } from "../../infra/google-translate-tts.ts";
import type { CacheKey, TtsCacheService } from "./cache-service.ts";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export interface BasicProviderDeps {
  readonly logger: Logger;
  readonly cache: TtsCacheService;
  readonly fetchTimeoutMs?: number;
}

export interface BasicSynthesisParams {
  readonly text: string;
  readonly language: string;
  readonly slow?: boolean;
}

export class BasicTtsProvider {
  private readonly logger: Logger;
  private readonly cache: TtsCacheService;
  private readonly fetchTimeoutMs: number;

  constructor(deps: BasicProviderDeps) {
    this.logger = deps.logger.withTag("TTS_BASIC");
    this.cache = deps.cache;
    this.fetchTimeoutMs = deps.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  }

  buildUrl(params: BasicSynthesisParams): string {
    return buildTranslateTtsUrl({
      text: params.text,
      language: params.language,
      slow: params.slow,
    });
  }

  async fetchAudio(params: BasicSynthesisParams): Promise<Buffer | null> {
    const cacheKey = this.buildCacheKey(params);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`cache hit (${params.text.length} chars)`);
      return cached;
    }
    const buffer = await this.fetchRemote(params);
    if (!buffer) return null;
    await this.cache.set(cacheKey, buffer);
    return buffer;
  }

  private async fetchRemote(
    params: BasicSynthesisParams,
  ): Promise<Buffer | null> {
    const url = this.buildUrl(params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.fetchTimeoutMs);
    if (typeof timer.unref === "function") timer.unref();
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.error(`basic fetch failed: ${response.status}`);
        return null;
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        this.logger.error(
          `basic fetch timed out after ${this.fetchTimeoutMs}ms`,
        );
      } else {
        this.logger.error("basic fetch threw", err);
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private buildCacheKey(params: BasicSynthesisParams): CacheKey {
    return {
      text: params.text,
      voice: `basic-${params.language}`,
      speed: params.slow ? 0.5 : 1.0,
      pitch: 0,
      provider: "basic",
    };
  }
}
