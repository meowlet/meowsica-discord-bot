export interface SupportedLanguage {
  readonly name: string;
  readonly nativeName: string;
  readonly code: string;
  readonly cloudCode: string;
  readonly flag: string;
}

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  {
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    code: "vi",
    cloudCode: "vi-VN",
    flag: "🇻🇳",
  },
  {
    name: "English (US)",
    nativeName: "English",
    code: "en",
    cloudCode: "en-US",
    flag: "🇺🇸",
  },
  {
    name: "Japanese",
    nativeName: "日本語",
    code: "ja",
    cloudCode: "ja-JP",
    flag: "🇯🇵",
  },
  {
    name: "Korean",
    nativeName: "한국어",
    code: "ko",
    cloudCode: "ko-KR",
    flag: "🇰🇷",
  },
  {
    name: "Chinese (Mandarin)",
    nativeName: "中文",
    code: "zh-CN",
    cloudCode: "cmn-CN",
    flag: "🇨🇳",
  },
  {
    name: "Afrikaans",
    nativeName: "Afrikaans",
    code: "af",
    cloudCode: "af-ZA",
    flag: "🇿🇦",
  },
  {
    name: "Arabic",
    nativeName: "العربية",
    code: "ar",
    cloudCode: "ar-XA",
    flag: "🇸🇦",
  },
  {
    name: "Armenian",
    nativeName: "Հայերեն",
    code: "hy",
    cloudCode: "hy-AM",
    flag: "🇦🇲",
  },
  {
    name: "Bengali",
    nativeName: "বাংলা",
    code: "bn",
    cloudCode: "bn-IN",
    flag: "🇧🇩",
  },
  {
    name: "Catalan",
    nativeName: "Català",
    code: "ca",
    cloudCode: "ca-ES",
    flag: "🇪🇸",
  },
  {
    name: "Croatian",
    nativeName: "Hrvatski",
    code: "hr",
    cloudCode: "hr-HR",
    flag: "🇭🇷",
  },
  {
    name: "Czech",
    nativeName: "Čeština",
    code: "cs",
    cloudCode: "cs-CZ",
    flag: "🇨🇿",
  },
  {
    name: "Danish",
    nativeName: "Dansk",
    code: "da",
    cloudCode: "da-DK",
    flag: "🇩🇰",
  },
  {
    name: "Dutch",
    nativeName: "Nederlands",
    code: "nl",
    cloudCode: "nl-NL",
    flag: "🇳🇱",
  },
  {
    name: "Filipino",
    nativeName: "Filipino",
    code: "tl",
    cloudCode: "fil-PH",
    flag: "🇵🇭",
  },
  {
    name: "Finnish",
    nativeName: "Suomi",
    code: "fi",
    cloudCode: "fi-FI",
    flag: "🇫🇮",
  },
  {
    name: "French",
    nativeName: "Français",
    code: "fr",
    cloudCode: "fr-FR",
    flag: "🇫🇷",
  },
  {
    name: "German",
    nativeName: "Deutsch",
    code: "de",
    cloudCode: "de-DE",
    flag: "🇩🇪",
  },
  {
    name: "Greek",
    nativeName: "Ελληνικά",
    code: "el",
    cloudCode: "el-GR",
    flag: "🇬🇷",
  },
  {
    name: "Hindi",
    nativeName: "हिन्दी",
    code: "hi",
    cloudCode: "hi-IN",
    flag: "🇮🇳",
  },
  {
