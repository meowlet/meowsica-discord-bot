import { getConfig } from "../config/index.ts";
import { ttsLogger } from "../utils/logger.ts";
import type {
  GoogleVoice,
  GoogleVoiceListResponse,
  VoiceOption,
} from "../types/google-tts.ts";
import { toPremiumLanguageCode } from "../constants/languages.ts";

const GOOGLE_VOICES_API_URL = "https://texttospeech.googleapis.com/v1/voices";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface VoiceCache {
  voices: GoogleVoice[];
  fetchedAt: number;
}

let voiceCache: VoiceCache | null = null;
let fetchPromise: Promise<GoogleVoice[]> | null = null;

/**
 * Check if a voice name is a Wavenet voice
 */
function isWavenetVoice(voiceName: string): boolean {
  return voiceName.includes("-Wavenet-");
}

/**
 * Fetch all available voices from Google Cloud TTS API
 * CRITICAL: Filters to keep ONLY Wavenet voices
 */
async function fetchVoicesFromAPI(): Promise<GoogleVoice[]> {
  const config = getConfig();
  const apiKey = config.googleCloudApiKey;
  if (!apiKey) {
    ttsLogger.warn("Google Cloud API key not configured");
    return [];
  }
  try {
    const response = await fetch(`${GOOGLE_VOICES_API_URL}?key=${apiKey}`);
    if (!response.ok) {
      const errorText = await response.text();
      ttsLogger.error(`Failed to fetch voices: ${response.status} - ${errorText}`);
      return [];
    }
    const data = (await response.json()) as GoogleVoiceListResponse;
    const allVoices = data.voices || [];
    const wavenetVoices = allVoices.filter((v) => isWavenetVoice(v.name));
    ttsLogger.info(
      `Fetched ${allVoices.length} voices, filtered to ${wavenetVoices.length} Wavenet voices`,
    );
    return wavenetVoices;
  } catch (error) {
    ttsLogger.error("Error fetching Google TTS voices:", error);
    return [];
  }
}

/**
 * Get cached Wavenet voices or fetch new ones if cache is expired
 */
export async function getGoogleVoices(): Promise<GoogleVoice[]> {
  const now = Date.now();
  if (voiceCache && now - voiceCache.fetchedAt < CACHE_TTL_MS) {
    return voiceCache.voices;
  }
  if (fetchPromise) {
    return fetchPromise;
  }
  fetchPromise = fetchVoicesFromAPI()
    .then((voices) => {
      voiceCache = { voices, fetchedAt: Date.now() };
      fetchPromise = null;
      ttsLogger.info(`Cached ${voices.length} Wavenet voices`);
      return voices;
    })
    .catch((error) => {
      fetchPromise = null;
      throw error;
    });
  return fetchPromise;
}

/**
 * Initialize voice cache on bot startup
 */
export async function initializeVoiceCache(): Promise<void> {
  const config = getConfig();
  if (!config.googleCloudApiKey) {
    ttsLogger.info("Skipping voice cache initialization - no API key configured");
    return;
  }
  ttsLogger.info("Initializing Google Wavenet voice cache...");
  await getGoogleVoices();
}


/**
 * Get Wavenet voice variants for a specific language code
 * @param languageCode - The language code (short or full, e.g., "vi" or "vi-VN")
 */
export async function getWavenetVoicesByLanguage(languageCode: string): Promise<VoiceOption[]> {
  const voices = await getGoogleVoices();
  const cloudCode = toPremiumLanguageCode(languageCode);
  const matchingVoices = voices.filter((voice) =>
    voice.languageCodes.some((code) => code === cloudCode || code.startsWith(cloudCode.split("-")[0] || "")),
  );
  const voiceOptions: VoiceOption[] = matchingVoices.map((voice) => {
    const variant = voice.name.split("-").pop() || "";
    const genderLabel = voice.ssmlGender === "MALE" ? "Male" : voice.ssmlGender === "FEMALE" ? "Female" : "Neutral";
    return {
      name: `Wavenet ${variant} (${genderLabel})`,
      value: voice.name,
      languageCode: voice.languageCodes[0] || languageCode,
      gender: voice.ssmlGender,
    };
  });
  return voiceOptions.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Check if a language has Wavenet voice support
 * Used for capability checks before rendering Encore options
 * @param languageCode - The language code (short or full, e.g., "vi" or "vi-VN")
 * @returns true if Wavenet voices are available for this language
 */
export async function hasWavenetSupport(languageCode: string): Promise<boolean> {
  const voices = await getWavenetVoicesByLanguage(languageCode);
  return voices.length > 0;
}

/**
 * Filter Wavenet voices based on search query within a language
 * Only returns Wavenet voices for Premium users
 */
export async function filterWavenetVoices(
  languageCode: string,
  query: string,
): Promise<VoiceOption[]> {
  const voices = await getWavenetVoicesByLanguage(languageCode);
  if (!query) return voices.slice(0, 25);
  const lowerQuery = query.toLowerCase();
  return voices
    .filter(
      (voice) =>
        voice.name.toLowerCase().includes(lowerQuery) ||
        voice.value.toLowerCase().includes(lowerQuery),
    )
    .slice(0, 25);
}

/**
 * Check if a voice name is a Wavenet voice (premium)
 */
export function isPremiumVoice(voiceName: string): boolean {
  return isWavenetVoice(voiceName);
}

/**
 * Get voice info by name
 */
export async function getVoiceByName(voiceName: string): Promise<GoogleVoice | null> {
  const voices = await getGoogleVoices();
  return voices.find((v) => v.name === voiceName) || null;
}

/**
 * Extract language code from voice name (e.g., "en-US-Wavenet-D" -> "en-US")
 */
export function extractLanguageCode(voiceName: string): string {
  const parts = voiceName.split("-");
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return parts[0] || "en-US";
}

/**
 * Force refresh the voice cache
 */
export async function refreshVoiceCache(): Promise<void> {
  voiceCache = null;
  await getGoogleVoices();
}

/**
 * Get the cache status
 */
export function getCacheStatus(): { isCached: boolean; voiceCount: number; cacheAge: number | null } {
  if (!voiceCache) {
    return { isCached: false, voiceCount: 0, cacheAge: null };
  }
  return {
    isCached: true,
    voiceCount: voiceCache.voices.length,
    cacheAge: Date.now() - voiceCache.fetchedAt,
  };
}
