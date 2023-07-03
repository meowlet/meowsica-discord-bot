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
const DEFAULT_SYNTHESIZE_TIMEOUT_MS = 15_000;
const DEFAULT_LIST_VOICES_TIMEOUT_MS = 10_000;

export interface GoogleCloudTtsClientDeps {
  readonly apiKey: string;
  readonly logger: Logger;
  readonly synthesizeTimeoutMs?: number;
  readonly listVoicesTimeoutMs?: number;
}

export class GoogleCloudTtsClient {
  private readonly apiKey: string;
  private readonly logger: Logger;
  private readonly synthesizeTimeoutMs: number;
  private readonly listVoicesTimeoutMs: number;

  constructor(deps: GoogleCloudTtsClientDeps) {
    this.apiKey = deps.apiKey;
    this.logger = deps.logger.withTag("GCTTS");
    this.synthesizeTimeoutMs =
      deps.synthesizeTimeoutMs ?? DEFAULT_SYNTHESIZE_TIMEOUT_MS;
    this.listVoicesTimeoutMs =
      deps.listVoicesTimeoutMs ?? DEFAULT_LIST_VOICES_TIMEOUT_MS;
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
    return this.executeRequest({
      url: SYNTHESIZE_URL,
      init: {
        method: "POST",
        headers: this.buildHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      },
      timeoutMs: this.synthesizeTimeoutMs,
      label: "synthesize",
      parse: async (response) => {
        const data = (await response.json()) as SynthesizeResponseBody;
        return Buffer.from(data.audioContent, "base64");
      },
    });
  }

  async listVoices(): Promise<GoogleVoice[]> {
    const result = await this.executeRequest({
      url: VOICES_URL,
      init: { headers: this.buildHeaders() },
      timeoutMs: this.listVoicesTimeoutMs,
      label: "listVoices",
      parse: async (response) => {
        const data = (await response.json()) as VoiceListResponse;
        return data.voices ?? [];
      },
    });
    return result ?? [];
  }

  private buildHeaders(
    extra: Record<string, string> = {},
  ): Record<string, string> {
    return { "x-goog-api-key": this.apiKey, ...extra };
  }

  private async executeRequest<T>(opts: {
    url: string;
    init: RequestInit;
    timeoutMs: number;
    label: string;
    parse: (response: Response) => Promise<T>;
  }): Promise<T | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    if (typeof timer.unref === "function") timer.unref();
    try {
      const response = await fetch(opts.url, {
        ...opts.init,
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await safeReadText(response);
        this.logger.error(
          `${opts.label} failed: ${response.status} - ${text}`,
        );
        return null;
      }
      return await opts.parse(response);
    } catch (err) {
      if (isAbortError(err)) {
        this.logger.error(
          `${opts.label} timed out after ${opts.timeoutMs}ms`,
        );
      } else {
        this.logger.error(`${opts.label} threw`, err);
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<unreadable body>";
  }
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "AbortError" || err.name === "TimeoutError")
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
