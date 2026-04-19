import type { Logger } from "../../shared/logger.ts";
import type { GoogleCloudTtsClient } from "../../infra/google-cloud-tts.ts";
import type { UsageService } from "../quota/usage-service.ts";
import type { TtsCacheService } from "./cache-service.ts";
import { QuotaExceededError } from "../../shared/errors.ts";
import {
  extractLanguageCodeFromVoice,
  getDefaultWavenetVoice,
} from "./voice-map.ts";
import { toCloudLanguageCode } from "./languages.ts";

export interface WavenetProviderDeps {
  readonly client: GoogleCloudTtsClient | null;
  readonly cache: TtsCacheService;
  readonly usage: UsageService;
  readonly logger: Logger;
}

export interface WavenetSynthesisParams {
  readonly text: string;
  readonly language: string;
  readonly userId: string;
  readonly voiceId?: string | null;
  readonly speakingRate: number;
  readonly pitch: number;
}

export interface WavenetSynthesisResult {
  readonly buffer: Buffer;
  readonly fromCache: boolean;
  readonly voiceName: string;
}

export class WavenetTtsProvider {
  private readonly client: GoogleCloudTtsClient | null;
  private readonly cache: TtsCacheService;
  private readonly usage: UsageService;
  private readonly logger: Logger;

  constructor(deps: WavenetProviderDeps) {
    this.client = deps.client;
    this.cache = deps.cache;
    this.usage = deps.usage;
    this.logger = deps.logger.withTag("TTS_WAVENET");
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  resolveVoice(language: string, voiceId?: string | null): string {
    if (voiceId) return voiceId;
    return getDefaultWavenetVoice(language);
  }

  async synthesize(
    params: WavenetSynthesisParams,
  ): Promise<WavenetSynthesisResult | null> {
    if (!this.client) return null;
    const voiceName = this.resolveVoice(params.language, params.voiceId);
    const languageCode = params.voiceId
      ? extractLanguageCodeFromVoice(params.voiceId)
      : toCloudLanguageCode(params.language);
    await this.usage.assertCanUse(params.userId, params.text.length);
    const cacheKey = {
      text: params.text,
      voice: voiceName,
      speed: params.speakingRate,
      pitch: params.pitch,
      provider: "wavenet" as const,
    };
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      await this.usage.recordUsage(params.userId, params.text.length);
      this.logger.debug(`cache hit (${params.text.length} chars)`);
      return { buffer: cached, fromCache: true, voiceName };
    }
    const buffer = await this.client.synthesize({
      text: params.text,
      voiceName,
      languageCode,
      speakingRate: params.speakingRate,
      pitch: params.pitch,
    });
    if (!buffer) return null;
    await this.cache.set(cacheKey, buffer);
    await this.usage.recordUsage(params.userId, params.text.length);
    this.logger.debug(`generated audio (${params.text.length} chars)`);
    return { buffer, fromCache: false, voiceName };
  }
}

export { QuotaExceededError };
