import type { Logger } from "../shared/logger.ts";

export type SsmlVoiceGender =
  | "SSML_VOICE_GENDER_UNSPECIFIED"
  | "MALE"
  | "FEMALE"
  | "NEUTRAL";

export interface GoogleVoice {
  readonly languageCodes: readonly string[];
  readonly name: string;
  readonly ssmlGender: SsmlVoiceGender;
  readonly naturalSampleRateHertz: number;
}

interface VoiceListResponse {
  readonly voices?: GoogleVoice[];
}

export interface SynthesizeParams {
  readonly text: string;
  readonly voiceName: string;
  readonly languageCode: string;
  readonly speakingRate: number;
  readonly pitch: number;
}

interface SynthesizeRequestBody {
  input: { text: string };
  voice: { languageCode: string; name: string };
  audioConfig: {
    audioEncoding: "OGG_OPUS";
    speakingRate: number;
    pitch: number;
  };
}

interface SynthesizeResponseBody {
  audioContent: string;
}

const SYNTHESIZE_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const VOICES_URL = "https://texttospeech.googleapis.com/v1/voices";

export interface GoogleCloudTtsClientDeps {
  readonly apiKey: string;
  readonly logger: Logger;
}

export class GoogleCloudTtsClient {
  private readonly apiKey: string;
  private readonly logger: Logger;

  constructor(deps: GoogleCloudTtsClientDeps) {
    this.apiKey = deps.apiKey;
    this.logger = deps.logger.withTag("GCTTS");
  }

  async synthesize(params: SynthesizeParams): Promise<Buffer | null> {
    const body: SynthesizeRequestBody = {
      input: { text: params.text },
      voice: { languageCode: params.languageCode, name: params.voiceName },
      audioConfig: {
        audioEncoding: "OGG_OPUS",
        speakingRate: clamp(params.speakingRate, 0.25, 4.0),
        pitch: clamp(params.pitch, -20.0, 20.0),
      },
    };
    try {
      const response = await fetch(`${SYNTHESIZE_URL}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`synthesize failed: ${response.status} - ${text}`);
        return null;
      }
      const data = (await response.json()) as SynthesizeResponseBody;
      return Buffer.from(data.audioContent, "base64");
    } catch (err) {
      this.logger.error("synthesize threw", err);
      return null;
    }
  }

  async listVoices(): Promise<GoogleVoice[]> {
    try {
      const response = await fetch(`${VOICES_URL}?key=${this.apiKey}`);
      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`listVoices failed: ${response.status} - ${text}`);
        return [];
      }
      const data = (await response.json()) as VoiceListResponse;
      return data.voices ?? [];
    } catch (err) {
      this.logger.error("listVoices threw", err);
      return [];
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
