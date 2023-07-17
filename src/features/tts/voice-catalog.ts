import type { Logger } from "../../shared/logger.ts";
import type {
  GoogleCloudTtsClient,
  GoogleVoice,
  SsmlVoiceGender,
} from "../../infra/google-cloud-tts.ts";
import { toCloudLanguageCode } from "./languages.ts";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface VoiceOption {
  readonly name: string;
  readonly value: string;
  readonly languageCode: string;
  readonly gender: SsmlVoiceGender;
}

interface CachedVoices {
  readonly voices: readonly GoogleVoice[];
  readonly fetchedAt: number;
}

export interface WavenetVoiceCatalogDeps {
  readonly client: GoogleCloudTtsClient | null;
  readonly logger: Logger;
}

export class WavenetVoiceCatalog {
  private readonly client: GoogleCloudTtsClient | null;
  private readonly logger: Logger;
  private cache: CachedVoices | null = null;
  private inflight: Promise<readonly GoogleVoice[]> | null = null;

  constructor(deps: WavenetVoiceCatalogDeps) {
    this.client = deps.client;
    this.logger = deps.logger.withTag("VOICE_CATALOG");
  }

  async warmup(): Promise<void> {
    if (!this.client) {
      this.logger.info("skipping warmup: no Google Cloud TTS client");
      return;
    }
    await this.list();
  }

  async list(): Promise<readonly GoogleVoice[]> {
    if (!this.client) return [];
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.voices;
    }
    if (this.inflight) return this.inflight;
    const promise = this.fetchAndCache();
    this.inflight = promise;
    try {
      return await promise;
    } finally {
      this.inflight = null;
    }
  }

  async getVoicesForLanguage(languageCode: string): Promise<VoiceOption[]> {
    const voices = await this.list();
    if (voices.length === 0) return [];
    const cloudCode = toCloudLanguageCode(languageCode);
    const langPrefix = cloudCode.split("-")[0] ?? "";
    return voices
      .filter((voice) =>
        voice.languageCodes.some(
          (code) =>
            code === cloudCode || (langPrefix && code.startsWith(langPrefix)),
        ),
      )
      .map((voice) => {
        const variant = voice.name.split("-").pop() ?? "";
        const genderLabel =
          voice.ssmlGender === "MALE"
            ? "Male"
            : voice.ssmlGender === "FEMALE"
              ? "Female"
              : "Neutral";
        return {
          name: `Wavenet ${variant} (${genderLabel})`,
          value: voice.name,
          languageCode: voice.languageCodes[0] ?? languageCode,
          gender: voice.ssmlGender,
        } satisfies VoiceOption;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async hasWavenetSupport(languageCode: string): Promise<boolean> {
    const voices = await this.getVoicesForLanguage(languageCode);
    return voices.length > 0;
  }

  private async fetchAndCache(): Promise<readonly GoogleVoice[]> {
    if (!this.client) return [];
    const all = await this.client.listVoices();
    const wavenet = all.filter((v) => v.name.includes("-Wavenet-"));
    this.cache = { voices: wavenet, fetchedAt: Date.now() };
    this.logger.info(`cached ${wavenet.length} wavenet voices`);
    return wavenet;
  }
}
