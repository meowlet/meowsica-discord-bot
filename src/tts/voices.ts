export interface VoiceLanguage {
  code: string;

  name: string;

  emoji: string;

  nativeName?: string;
}

export const VOICE_LANGUAGES: Record<string, VoiceLanguage> = {
  af: { code: "af", name: "Afrikaans", emoji: "🇿🇦" },
  ar: { code: "ar", name: "Arabic", emoji: "🇸🇦", nativeName: "العربية" },
  bn: { code: "bn", name: "Bengali", emoji: "🇧🇩", nativeName: "বাংলা" },
  ca: { code: "ca", name: "Catalan", emoji: "🇪🇸", nativeName: "Català" },
  cmn: {
    code: "cmn",
    name: "Chinese (Mandarin)",
    emoji: "🇨🇳",
    nativeName: "中文",
  },
  cs: { code: "cs", name: "Czech", emoji: "🇨🇿", nativeName: "Čeština" },
  da: { code: "da", name: "Danish", emoji: "🇩🇰", nativeName: "Dansk" },
  de: { code: "de", name: "German", emoji: "🇩🇪", nativeName: "Deutsch" },
  el: { code: "el", name: "Greek", emoji: "🇬🇷", nativeName: "Ελληνικά" },
  en: { code: "en", name: "English", emoji: "🇺🇸" },
  es: { code: "es", name: "Spanish", emoji: "🇪🇸", nativeName: "Español" },
  fi: { code: "fi", name: "Finnish", emoji: "🇫🇮", nativeName: "Suomi" },
  fil: { code: "fil", name: "Filipino", emoji: "🇵🇭", nativeName: "Filipino" },
  fr: { code: "fr", name: "French", emoji: "🇫🇷", nativeName: "Français" },
  hi: { code: "hi", name: "Hindi", emoji: "🇮🇳", nativeName: "हिन्दी" },
  hr: { code: "hr", name: "Croatian", emoji: "🇭🇷", nativeName: "Hrvatski" },
  hu: { code: "hu", name: "Hungarian", emoji: "🇭🇺", nativeName: "Magyar" },
  hy: { code: "hy", name: "Armenian", emoji: "🇦🇲", nativeName: "Հայերեն" },
  id: {
    code: "id",
    name: "Indonesian",
    emoji: "🇮🇩",
    nativeName: "Bahasa Indonesia",
  },
  is: { code: "is", name: "Icelandic", emoji: "🇮🇸", nativeName: "Íslenska" },
  it: { code: "it", name: "Italian", emoji: "🇮🇹", nativeName: "Italiano" },
  ja: { code: "ja", name: "Japanese", emoji: "🇯🇵", nativeName: "日本語" },
  jv: { code: "jv", name: "Javanese", emoji: "🇮🇩", nativeName: "Basa Jawa" },
  km: { code: "km", name: "Khmer", emoji: "🇰🇭", nativeName: "ភាសាខ្មែរ" },
  ko: { code: "ko", name: "Korean", emoji: "🇰🇷", nativeName: "한국어" },
  lv: { code: "lv", name: "Latvian", emoji: "🇱🇻", nativeName: "Latviešu" },
  ml: { code: "ml", name: "Malayalam", emoji: "🇮🇳", nativeName: "മലയാളം" },
  mr: { code: "mr", name: "Marathi", emoji: "🇮🇳", nativeName: "मराठी" },
  nb: { code: "nb", name: "Norwegian", emoji: "🇳🇴", nativeName: "Norsk" },
  ne: { code: "ne", name: "Nepali", emoji: "🇳🇵", nativeName: "नेपाली" },
  nl: { code: "nl", name: "Dutch", emoji: "🇳🇱", nativeName: "Nederlands" },
  pl: { code: "pl", name: "Polish", emoji: "🇵🇱", nativeName: "Polski" },
  pt: { code: "pt", name: "Portuguese", emoji: "🇵🇹", nativeName: "Português" },
  ro: { code: "ro", name: "Romanian", emoji: "🇷🇴", nativeName: "Română" },
  ru: { code: "ru", name: "Russian", emoji: "🇷🇺", nativeName: "Русский" },
  si: { code: "si", name: "Sinhala", emoji: "🇱🇰", nativeName: "සිංහල" },
  sk: { code: "sk", name: "Slovak", emoji: "🇸🇰", nativeName: "Slovenčina" },
  sr: { code: "sr", name: "Serbian", emoji: "🇷🇸", nativeName: "Српски" },
  su: { code: "su", name: "Sundanese", emoji: "🇮🇩", nativeName: "Basa Sunda" },
  sv: { code: "sv", name: "Swedish", emoji: "🇸🇪", nativeName: "Svenska" },
  sw: { code: "sw", name: "Swahili", emoji: "🇹🇿", nativeName: "Kiswahili" },
  ta: { code: "ta", name: "Tamil", emoji: "🇮🇳", nativeName: "தமிழ்" },
  te: { code: "te", name: "Telugu", emoji: "🇮🇳", nativeName: "తెలుగు" },
  th: { code: "th", name: "Thai", emoji: "🇹🇭", nativeName: "ไทย" },
  tr: { code: "tr", name: "Turkish", emoji: "🇹🇷", nativeName: "Türkçe" },
  uk: { code: "uk", name: "Ukrainian", emoji: "🇺🇦", nativeName: "Українська" },
  vi: { code: "vi", name: "Vietnamese", emoji: "🇻🇳", nativeName: "Tiếng Việt" },
} as const;

export const VOICE_LANGUAGE_CODES = Object.keys(
  VOICE_LANGUAGES,
) as VoiceLanguageCode[];

export type VoiceLanguageCode = keyof typeof VOICE_LANGUAGES;

export const DEFAULT_VOICE_LANGUAGE: VoiceLanguageCode = "vi";

export function isValidVoiceLanguage(code: string): code is VoiceLanguageCode {
  return code in VOICE_LANGUAGES;
}

export function getVoiceLanguage(code: string): VoiceLanguage | undefined {
  return VOICE_LANGUAGES[code];
}

export function getVoiceLanguageDisplay(code: string): string {
  const lang = VOICE_LANGUAGES[code];
  if (!lang) return code;
  return `${lang.emoji} ${lang.name}`;
}

export function getSortedVoiceLanguages(): VoiceLanguage[] {
  return Object.values(VOICE_LANGUAGES).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
