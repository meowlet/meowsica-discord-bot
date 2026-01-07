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
 * 
 * PRIORITY ORDER: Vietnamese, English, Japanese, Korean, Chinese are at top (Page 1)
 * Then alphabetical order for remaining languages
 * 
 * Total: 47 languages (Page 1: 24, Page 2: 23)
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  // === PRIORITY LANGUAGES (Top of Page 1) ===
  { name: "Vietnamese", nativeName: "Tiếng Việt", code: "vi", cloudCode: "vi-VN" },
  { name: "English (US)", nativeName: "English", code: "en", cloudCode: "en-US" },
  { name: "Japanese", nativeName: "日本語", code: "ja", cloudCode: "ja-JP" },
  { name: "Korean", nativeName: "한국어", code: "ko", cloudCode: "ko-KR" },
  { name: "Chinese (Mandarin)", nativeName: "中文", code: "zh-CN", cloudCode: "cmn-CN" },

  // === PAGE 1 (A-I, alphabetical) ===
  { name: "Afrikaans", nativeName: "Afrikaans", code: "af", cloudCode: "af-ZA" },
  { name: "Arabic", nativeName: "العربية", code: "ar", cloudCode: "ar-XA" },
  { name: "Armenian", nativeName: "Հdelays", code: "hy", cloudCode: "hy-AM" },
  { name: "Bengali", nativeName: "বাংলা", code: "bn", cloudCode: "bn-IN" },
  { name: "Catalan", nativeName: "Català", code: "ca", cloudCode: "ca-ES" },
  { name: "Croatian", nativeName: "Hrvatski", code: "hr", cloudCode: "hr-HR" },
  { name: "Czech", nativeName: "Čeština", code: "cs", cloudCode: "cs-CZ" },
  { name: "Danish", nativeName: "Dansk", code: "da", cloudCode: "da-DK" },
  { name: "Dutch", nativeName: "Nederlands", code: "nl", cloudCode: "nl-NL" },
  { name: "Filipino", nativeName: "Filipino", code: "tl", cloudCode: "fil-PH" },
  { name: "Finnish", nativeName: "Suomi", code: "fi", cloudCode: "fi-FI" },
  { name: "French", nativeName: "Français", code: "fr", cloudCode: "fr-FR" },
  { name: "German", nativeName: "Deutsch", code: "de", cloudCode: "de-DE" },
  { name: "Greek", nativeName: "Ελληνικά", code: "el", cloudCode: "el-GR" },
  { name: "Hindi", nativeName: "हिन्दी", code: "hi", cloudCode: "hi-IN" },
  { name: "Hungarian", nativeName: "Magyar", code: "hu", cloudCode: "hu-HU" },
  { name: "Icelandic", nativeName: "Íslenska", code: "is", cloudCode: "is-IS" },
  { name: "Indonesian", nativeName: "Bahasa Indonesia", code: "id", cloudCode: "id-ID" },
  { name: "Italian", nativeName: "Italiano", code: "it", cloudCode: "it-IT" },

  // === PAGE 2 (J-Z, alphabetical) ===
  { name: "Javanese", nativeName: "Basa Jawa", code: "jw", cloudCode: "jv-ID" },
  { name: "Khmer", nativeName: "ភាសាខ្មែរ", code: "km", cloudCode: "km-KH" },
  { name: "Latvian", nativeName: "Latviešu", code: "lv", cloudCode: "lv-LV" },
  { name: "Malayalam", nativeName: "മലയാളം", code: "ml", cloudCode: "ml-IN" },
  { name: "Marathi", nativeName: "मराठी", code: "mr", cloudCode: "mr-IN" },
  { name: "Nepali", nativeName: "नेपाली", code: "ne", cloudCode: "ne-NP" },
  { name: "Norwegian", nativeName: "Norsk", code: "no", cloudCode: "nb-NO" },
  { name: "Polish", nativeName: "Polski", code: "pl", cloudCode: "pl-PL" },
  { name: "Portuguese", nativeName: "Português", code: "pt", cloudCode: "pt-BR" },
  { name: "Romanian", nativeName: "Română", code: "ro", cloudCode: "ro-RO" },
  { name: "Russian", nativeName: "Русский", code: "ru", cloudCode: "ru-RU" },
  { name: "Serbian", nativeName: "Српски", code: "sr", cloudCode: "sr-RS" },
  { name: "Sinhala", nativeName: "සිංහල", code: "si", cloudCode: "si-LK" },
  { name: "Slovak", nativeName: "Slovenčina", code: "sk", cloudCode: "sk-SK" },
  { name: "Spanish", nativeName: "Español", code: "es", cloudCode: "es-ES" },
  { name: "Sundanese", nativeName: "Basa Sunda", code: "su", cloudCode: "su-ID" },
  { name: "Swahili", nativeName: "Kiswahili", code: "sw", cloudCode: "sw-TZ" },
  { name: "Swedish", nativeName: "Svenska", code: "sv", cloudCode: "sv-SE" },
  { name: "Tamil", nativeName: "தமிழ்", code: "ta", cloudCode: "ta-IN" },
  { name: "Telugu", nativeName: "తెలుగు", code: "te", cloudCode: "te-IN" },
  { name: "Thai", nativeName: "ไทย", code: "th", cloudCode: "th-TH" },
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

