/**
 * Curated list of supported languages for TTS
 * This provides a clean UX without clutter from obscure languages
 */
export interface SupportedLanguage {
  readonly name: string;
  readonly nativeName: string;
  readonly code: string;
  readonly cloudCode: string;
  readonly flag: string;
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
  { name: "Vietnamese", nativeName: "Tiếng Việt", code: "vi", cloudCode: "vi-VN", flag: "🇻🇳" },
  { name: "English (US)", nativeName: "English", code: "en", cloudCode: "en-US", flag: "🇺🇸" },
  { name: "Japanese", nativeName: "日本語", code: "ja", cloudCode: "ja-JP", flag: "🇯🇵" },
  { name: "Korean", nativeName: "한국어", code: "ko", cloudCode: "ko-KR", flag: "🇰🇷" },
  { name: "Chinese (Mandarin)", nativeName: "中文", code: "zh-CN", cloudCode: "cmn-CN", flag: "🇨🇳" },

  // === PAGE 1 (A-I, alphabetical) ===
  { name: "Afrikaans", nativeName: "Afrikaans", code: "af", cloudCode: "af-ZA", flag: "🇿🇦" },
  { name: "Arabic", nativeName: "العربية", code: "ar", cloudCode: "ar-XA", flag: "🇸🇦" },
  { name: "Armenian", nativeName: "Հայdelays", code: "hy", cloudCode: "hy-AM", flag: "🇦🇲" },
  { name: "Bengali", nativeName: "বাংলা", code: "bn", cloudCode: "bn-IN", flag: "🇧🇩" },
  { name: "Catalan", nativeName: "Català", code: "ca", cloudCode: "ca-ES", flag: "🇪🇸" },
  { name: "Croatian", nativeName: "Hrvatski", code: "hr", cloudCode: "hr-HR", flag: "🇭🇷" },
  { name: "Czech", nativeName: "Čeština", code: "cs", cloudCode: "cs-CZ", flag: "🇨🇿" },
  { name: "Danish", nativeName: "Dansk", code: "da", cloudCode: "da-DK", flag: "🇩🇰" },
  { name: "Dutch", nativeName: "Nederlands", code: "nl", cloudCode: "nl-NL", flag: "🇳🇱" },
  { name: "Filipino", nativeName: "Filipino", code: "tl", cloudCode: "fil-PH", flag: "🇵🇭" },
  { name: "Finnish", nativeName: "Suomi", code: "fi", cloudCode: "fi-FI", flag: "🇫🇮" },
  { name: "French", nativeName: "Français", code: "fr", cloudCode: "fr-FR", flag: "🇫🇷" },
  { name: "German", nativeName: "Deutsch", code: "de", cloudCode: "de-DE", flag: "🇩🇪" },
  { name: "Greek", nativeName: "Ελληνικά", code: "el", cloudCode: "el-GR", flag: "🇬🇷" },
  { name: "Hindi", nativeName: "हिन्दी", code: "hi", cloudCode: "hi-IN", flag: "🇮🇳" },
  { name: "Hungarian", nativeName: "Magyar", code: "hu", cloudCode: "hu-HU", flag: "🇭🇺" },
  { name: "Icelandic", nativeName: "Íslenska", code: "is", cloudCode: "is-IS", flag: "🇮🇸" },
  { name: "Indonesian", nativeName: "Bahasa Indonesia", code: "id", cloudCode: "id-ID", flag: "🇮🇩" },
  { name: "Italian", nativeName: "Italiano", code: "it", cloudCode: "it-IT", flag: "🇮🇹" },

  // === PAGE 2 (J-Z, alphabetical) ===
  { name: "Javanese", nativeName: "Basa Jawa", code: "jw", cloudCode: "jv-ID", flag: "🇮🇩" },
  { name: "Khmer", nativeName: "ភាសាខ្មែរ", code: "km", cloudCode: "km-KH", flag: "🇰🇭" },
  { name: "Latvian", nativeName: "Latviešu", code: "lv", cloudCode: "lv-LV", flag: "🇱🇻" },
  { name: "Malayalam", nativeName: "മലയാളം", code: "ml", cloudCode: "ml-IN", flag: "🇮🇳" },
  { name: "Marathi", nativeName: "मराठी", code: "mr", cloudCode: "mr-IN", flag: "🇮🇳" },
  { name: "Nepali", nativeName: "नेपाली", code: "ne", cloudCode: "ne-NP", flag: "🇳🇵" },
  { name: "Norwegian", nativeName: "Norsk", code: "no", cloudCode: "nb-NO", flag: "🇳🇴" },
  { name: "Polish", nativeName: "Polski", code: "pl", cloudCode: "pl-PL", flag: "🇵🇱" },
  { name: "Portuguese", nativeName: "Português", code: "pt", cloudCode: "pt-BR", flag: "🇧🇷" },
  { name: "Romanian", nativeName: "Română", code: "ro", cloudCode: "ro-RO", flag: "🇷🇴" },
  { name: "Russian", nativeName: "Русский", code: "ru", cloudCode: "ru-RU", flag: "🇷🇺" },
  { name: "Serbian", nativeName: "Српски", code: "sr", cloudCode: "sr-RS", flag: "🇷🇸" },
  { name: "Sinhala", nativeName: "සිංහල", code: "si", cloudCode: "si-LK", flag: "🇱🇰" },
  { name: "Slovak", nativeName: "Slovenčina", code: "sk", cloudCode: "sk-SK", flag: "🇸🇰" },
  { name: "Spanish", nativeName: "Español", code: "es", cloudCode: "es-ES", flag: "🇪🇸" },
  { name: "Sundanese", nativeName: "Basa Sunda", code: "su", cloudCode: "su-ID", flag: "🇮🇩" },
  { name: "Swahili", nativeName: "Kiswahili", code: "sw", cloudCode: "sw-TZ", flag: "🇹🇿" },
  { name: "Swedish", nativeName: "Svenska", code: "sv", cloudCode: "sv-SE", flag: "🇸🇪" },
  { name: "Tamil", nativeName: "தமிழ்", code: "ta", cloudCode: "ta-IN", flag: "🇮🇳" },
  { name: "Telugu", nativeName: "తెలుగు", code: "te", cloudCode: "te-IN", flag: "🇮🇳" },
  { name: "Thai", nativeName: "ไทย", code: "th", cloudCode: "th-TH", flag: "🇹🇭" },
  { name: "Turkish", nativeName: "Türkçe", code: "tr", cloudCode: "tr-TR", flag: "🇹🇷" },
  { name: "Ukrainian", nativeName: "Українська", code: "uk", cloudCode: "uk-UA", flag: "🇺🇦" },
] as const;

/**
 * Get supported language by short code
 * Handles both exact matches (e.g., "zh-CN") and short code matches (e.g., "zh")
 */
export function getSupportedLanguageByCode(code: string): SupportedLanguage | undefined {
  // First try exact match (handles cases like "zh-CN" === "zh-CN")
  const exactMatch = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  if (exactMatch) {
    return exactMatch;
  }
  // If no exact match, try matching by short code
  // Extract shortCode from input and compare with each language's code
  const shortCode = code.includes("-") ? code.split("-")[0] : code;
  return SUPPORTED_LANGUAGES.find((lang) => {
    // If lang.code contains "-", extract its shortCode for comparison
    // Otherwise compare directly
    const langShortCode = lang.code.includes("-") ? lang.code.split("-")[0] : lang.code;
    return langShortCode === shortCode;
  });
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

