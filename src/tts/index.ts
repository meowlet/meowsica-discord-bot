/**
 * TTS Module Exports
 *
 * Central export point for all TTS-related functionality.
 */

// Voice language configuration
export {
  VOICE_LANGUAGES,
  VOICE_LANGUAGE_CODES,
  DEFAULT_VOICE_LANGUAGE,
  isValidVoiceLanguage,
  getVoiceLanguage,
  getVoiceLanguageDisplay,
  getSortedVoiceLanguages,
  type VoiceLanguage,
  type VoiceLanguageCode,
} from "./voices.ts";

// TTS provider (Google TTS)
export {
  createTTSPayloads,
  validateTTSText,
  type TTSPayload,
} from "./provider.ts";

// TTS player and queue management
export {
  queueTTS,
  skipCurrent,
  clearQueue,
  getQueueStatus,
  cleanupPlayer,
  isPlaying,
  type QueueItem,
} from "./player.ts";
