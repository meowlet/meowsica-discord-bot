import type { Logger } from "../../shared/logger.ts";
import { buildTranslateTtsUrl } from "../../infra/google-translate-tts.ts";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

export interface BasicProviderDeps {
  readonly logger: Logger;
}

export interface BasicSynthesisParams {
  readonly text: string;
  readonly language: string;
  readonly slow?: boolean;
}

export class BasicTtsProvider {
  private readonly logger: Logger;

  constructor(deps: BasicProviderDeps) {
    this.logger = deps.logger.withTag("TTS_BASIC");
  }

  buildUrl(params: BasicSynthesisParams): string {
    return buildTranslateTtsUrl({
      text: params.text,
      language: params.language,
      slow: params.slow,
    });
  }

  async fetchAudio(params: BasicSynthesisParams): Promise<Buffer | null> {
    const url = this.buildUrl(params);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) {
        this.logger.error(`basic fetch failed: ${response.status}`);
        return null;
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      this.logger.error("basic fetch threw", err);
      return null;
    }
  }
}
