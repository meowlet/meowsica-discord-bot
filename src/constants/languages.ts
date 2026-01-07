/**
 * Curated list of supported languages for TTS
 * This provides a clean UX without clutter from obscure languages
 */
export interface SupportedLanguage {
  readonly name: string;
  readonly nativeName: string;
  readonly code: string;
  readonly cloudCode: string;
}

/**
 * SUPPORTED_LANGUAGES - The only languages shown in the Discord UI
 * - `code`: Short code for Google Translate (Basic provider)
 * - `cloudCode`: Full locale code for Google Cloud TTS (Premium provider)
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  { name: "Vietnamese", nativeName: "Tiếng Việt", code: "vi", cloudCode: "vi-VN" },
  { name: "English (US)", nativeName: "English", code: "en", cloudCode: "en-US" },
  { name: "Japanese", nativeName: "日本語", code: "ja", cloudCode: "ja-JP" },
  { name: "Korean", nativeName: "한국어", code: "ko", cloudCode: "ko-KR" },
  { name: "Chinese (Mandarin)", nativeName: "中文", code: "cmn", cloudCode: "cmn-CN" },
  { name: "Thai", nativeName: "ไทย", code: "th", cloudCode: "th-TH" },
  { name: "Indonesian", nativeName: "Bahasa Indonesia", code: "id", cloudCode: "id-ID" },
  { name: "Filipino", nativeName: "Filipino", code: "fil", cloudCode: "fil-PH" },
  { name: "Spanish", nativeName: "Español", code: "es", cloudCode: "es-ES" },
  { name: "French", nativeName: "Français", code: "fr", cloudCode: "fr-FR" },
  { name: "German", nativeName: "Deutsch", code: "de", cloudCode: "de-DE" },
  { name: "Italian", nativeName: "Italiano", code: "it", cloudCode: "it-IT" },
  { name: "Portuguese", nativeName: "Português", code: "pt", cloudCode: "pt-BR" },
  { name: "Russian", nativeName: "Русский", code: "ru", cloudCode: "ru-RU" },
  { name: "Hindi", nativeName: "हिन्दी", code: "hi", cloudCode: "hi-IN" },
  { name: "Arabic", nativeName: "العربية", code: "ar", cloudCode: "ar-XA" },
  { name: "Dutch", nativeName: "Nederlands", code: "nl", cloudCode: "nl-NL" },
  { name: "Polish", nativeName: "Polski", code: "pl", cloudCode: "pl-PL" },
  { name: "Turkish", nativeName: "Türkçe", code: "tr", cloudCode: "tr-TR" },
  { name: "Ukrainian", nativeName: "Українська", code: "uk", cloudCode: "uk-UA" },
] as const;

/**
 * Get supported language by short code
 */
export function getSupportedLanguageByCode(code: string): SupportedLanguage | undefined {
  const shortCode = code.includes("-") ? code.split("-")[0] : code;
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === shortCode);
}

/**
 * Get supported language by cloud code
 */
export function getSupportedLanguageByCloudCode(cloudCode: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.cloudCode === cloudCode);
}

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(code: string): boolean {
  return getSupportedLanguageByCode(code) !== undefined;
}

/**
 * Get the short code for Google Translate from any code format
 */
export function toBasicLanguageCode(code: string): string {
  const lang = getSupportedLanguageByCode(code);
  return lang?.code || code.split("-")[0] || code;
}

/**
 * Get the cloud code for Google Cloud TTS from any code format
 */
export function toPremiumLanguageCode(code: string): string {
  const lang = getSupportedLanguageByCode(code);
  return lang?.cloudCode || code;
}

/**
 * Filter supported languages by search query
 */
export function filterSupportedLanguages(query: string): SupportedLanguage[] {
  if (!query) return [...SUPPORTED_LANGUAGES];
  const lowerQuery = query.toLowerCase();
  return SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(lowerQuery) ||
      lang.nativeName.toLowerCase().includes(lowerQuery) ||
      lang.code.toLowerCase().includes(lowerQuery),
  );
}

