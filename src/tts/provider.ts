import type { VoiceLanguageCode } from "./voices.ts";
import { getConfig } from "../config/index.ts";
import { ttsLogger } from "../utils/logger.ts";
import { extractLanguageCode } from "../services/GoogleTTSService.ts";

export type TTSProviderType = "basic" | "premium";

export interface TTSPayload {
  url: string;
  text: string;
  language: VoiceLanguageCode;
  provider: TTSProviderType;
  voiceName?: string | null;
}

export interface PremiumAudioResult {
  audioContent: Buffer;
  provider: "premium";
}

export interface BasicAudioResult {
  url: string;
  provider: "basic";
}

export type AudioResult = PremiumAudioResult | BasicAudioResult;

interface GoogleCloudTTSRequest {
  input: { text: string };
  voice: {
    languageCode: string;
    name?: string;
    ssmlGender?: "NEUTRAL" | "MALE" | "FEMALE";
  };
  audioConfig: {
    audioEncoding: "MP3" | "OGG_OPUS" | "LINEAR16";
    speakingRate?: number;
    pitch?: number;
  };
}

interface GoogleCloudTTSResponse {
  audioContent: string;
}

const MAX_TEXT_LENGTH = 200;

const GOOGLE_TTS_BASE = "https://translate.google.com/translate_tts";
const GOOGLE_CLOUD_TTS_BASE =
  "https://texttospeech.googleapis.com/v1/text:synthesize";

const WAVENET_VOICE_MAP: Record<string, string> = {
  en: "en-US-Wavenet-D",
  vi: "vi-VN-Wavenet-A",
  ja: "ja-JP-Wavenet-B",
  ko: "ko-KR-Wavenet-A",
  fr: "fr-FR-Wavenet-A",
  de: "de-DE-Wavenet-A",
  es: "es-ES-Wavenet-B",
  it: "it-IT-Wavenet-A",
  pt: "pt-BR-Wavenet-A",
  ru: "ru-RU-Wavenet-A",
  cmn: "cmn-CN-Wavenet-A",
  ar: "ar-XA-Wavenet-A",
  hi: "hi-IN-Wavenet-A",
  id: "id-ID-Wavenet-A",
  nl: "nl-NL-Wavenet-A",
  pl: "pl-PL-Wavenet-A",
  tr: "tr-TR-Wavenet-A",
  th: "th-TH-Standard-A",
  uk: "uk-UA-Wavenet-A",
  cs: "cs-CZ-Wavenet-A",
  da: "da-DK-Wavenet-A",
  el: "el-GR-Wavenet-A",
  fi: "fi-FI-Wavenet-A",
  hu: "hu-HU-Wavenet-A",
  nb: "nb-NO-Wavenet-A",
  ro: "ro-RO-Wavenet-A",
  sk: "sk-SK-Wavenet-A",
  sv: "sv-SE-Wavenet-A",
  bn: "bn-IN-Wavenet-A",
  ta: "ta-IN-Wavenet-A",
  te: "te-IN-Standard-A",
  ml: "ml-IN-Wavenet-A",
  mr: "mr-IN-Wavenet-A",
  fil: "fil-PH-Wavenet-A",
  af: "af-ZA-Standard-A",
  ca: "ca-ES-Standard-A",
  hr: "hr-HR-Standard-A",
  hy: "hy-AM-Standard-A",
  is: "is-IS-Standard-A",
  jv: "jv-ID-Standard-A",
  km: "km-KH-Standard-A",
  lv: "lv-LV-Standard-A",
  ne: "ne-NP-Standard-A",
  si: "si-LK-Standard-A",
  sr: "sr-RS-Standard-A",
  su: "su-ID-Standard-A",
  sw: "sw-KE-Standard-A",
};

/**
 * Get the Wavenet voice name for a language code
 */
function getWavenetVoice(languageCode: VoiceLanguageCode): string {
  return WAVENET_VOICE_MAP[languageCode] || `${languageCode}-Standard-A`;
}

/**
 * Get the language code in Google Cloud format
 */
function getCloudLanguageCode(languageCode: VoiceLanguageCode): string {
  const voiceName = getWavenetVoice(languageCode);
  const parts = voiceName.split("-");
  return parts.slice(0, 2).join("-");
}

/**
 * Synthesize speech using Google Cloud TTS (Wavenet only)
 * This is the Premium provider for Encore subscribers
 */
export async function synthesizeWavenet(
  text: string,
  language: VoiceLanguageCode,
  specificVoiceName?: string | null,
): Promise<Buffer | null> {
  const config = getConfig();
  const apiKey = config.googleCloudApiKey;
  if (!apiKey) {
    ttsLogger.warn("Google Cloud API key not configured, falling back to basic TTS");
    return null;
  }
  const voiceName = specificVoiceName || getWavenetVoice(language);
  const languageCode = specificVoiceName
    ? extractLanguageCode(specificVoiceName)
    : getCloudLanguageCode(language);
  const requestBody: GoogleCloudTTSRequest = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 1.0,
      pitch: 0,
    },
  };
  try {
    const response = await fetch(`${GOOGLE_CLOUD_TTS_BASE}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const errorText = await response.text();
      ttsLogger.error(`Wavenet TTS request failed: ${response.status} - ${errorText}`);
      return null;
    }
    const data = (await response.json()) as GoogleCloudTTSResponse;
    const audioBuffer = Buffer.from(data.audioContent, "base64");
    return audioBuffer;
  } catch (error) {
    ttsLogger.error("Failed to synthesize Wavenet TTS:", error);
    return null;
  }
}

/**
 * Check if Wavenet TTS is available
 */
export function isWavenetAvailable(): boolean {
  const config = getConfig();
  return config.googleCloudApiKey !== null;
}

/**
 * Convert full locale code to short code for Google Translate API
 * e.g., "vi-VN" -> "vi", "en-US" -> "en"
 */
function toShortLanguageCode(languageCode: string): string {
  return languageCode.split("-")[0] || languageCode;
}

/**
 * Generate URL for Google Translate TTS (Basic/Free provider)
 * CRITICAL: Google Translate requires short language codes (e.g., "vi" not "vi-VN")
 */
function generateTTSUrl(text: string, language: string): string {
  const shortLang = toShortLanguageCode(language);
  const params = new URLSearchParams({
    ie: "UTF-8",
    q: text,
    tl: shortLang,
    client: "tw-ob",
    ttsspeed: "1",
  });
  return `${GOOGLE_TTS_BASE}?${params.toString()}`;
}

function splitText(text: string): string[] {
  if (text.length <= MAX_TEXT_LENGTH) {
    return [text];
  }

  const segments: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentSegment = "";

  for (const sentence of sentences) {
    // If a single sentence is too long, split it further
    if (sentence.length > MAX_TEXT_LENGTH) {
      // Flush current segment first
      if (currentSegment) {
        segments.push(currentSegment.trim());
        currentSegment = "";
      }

      // Split long sentence by commas or spaces
      const parts = sentence.split(/(?<=[,])\s+/);
      for (const part of parts) {
        if (part.length > MAX_TEXT_LENGTH) {
          // Last resort: split by max length
          for (let i = 0; i < part.length; i += MAX_TEXT_LENGTH) {
            segments.push(part.slice(i, i + MAX_TEXT_LENGTH).trim());
          }
        } else if (currentSegment.length + part.length + 1 <= MAX_TEXT_LENGTH) {
          currentSegment += (currentSegment ? " " : "") + part;
        } else {
          if (currentSegment) {
            segments.push(currentSegment.trim());
          }
          currentSegment = part;
        }
      }
    } else if (currentSegment.length + sentence.length + 1 <= MAX_TEXT_LENGTH) {
      // Can fit in current segment
      currentSegment += (currentSegment ? " " : "") + sentence;
    } else {
      // Start new segment
      if (currentSegment) {
        segments.push(currentSegment.trim());
      }
      currentSegment = sentence;
    }
  }

  // Don't forget the last segment
  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  return segments.filter((s) => s.length > 0);
}

/**
 * Sanitize text for TTS
 * - Removes URLs (replaced with indicator)
 * - Cleans up Discord formatting
 * - Removes excessive whitespace
 */
function sanitizeText(text: string): string {
  return (
    text
      // Replace URLs with a spoken indicator
      .replace(/https?:\/\/[^\s]+/gi, "link")

      .replace(/<@!?\d+>/g, "someone")

      .replace(/<#\d+>/g, "a channel")

      .replace(/<@&\d+>/g, "a role")

      .replace(/<a?:\w+:\d+>/g, "")
      // Remove markdown bold/italic
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")

      .replace(/__([^_]+)__/g, "$1")

      .replace(/~~([^~]+)~~/g, "$1")

      .replace(/\|\|([^|]+)\|\|/g, "$1")

      .replace(/```[\s\S]*?```/g, "code block")

      .replace(/`([^`]+)`/g, "$1")
      // Collapse multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Create TTS payloads for a message
 * Returns multiple payloads if the text needs to be split
 */
export function createTTSPayloads(
  text: string,
  language: VoiceLanguageCode,
  provider: TTSProviderType = "basic",
  voiceName?: string | null,
): TTSPayload[] {
  const sanitized = sanitizeText(text);
  if (!sanitized) {
    return [];
  }
  const segments = splitText(sanitized);
  return segments.map((segment) => ({
    url: generateTTSUrl(segment, language),
    text: segment,
    language,
    provider,
    voiceName,
  }));
}

export function validateTTSText(text: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = sanitizeText(text);

  if (!sanitized) {
    return {
      valid: false,
      sanitized: "",
      error: "Message is empty after removing URLs and formatting.",
    };
  }

  // Maximum total length (generous limit)
  if (sanitized.length > 2000) {
    return {
      valid: false,
      sanitized,
      error: "Message is too long.",
    };
  }

  return {
    valid: true,
    sanitized,
  };
}
