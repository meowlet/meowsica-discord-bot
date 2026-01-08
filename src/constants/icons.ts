/**
 * Centralized Icon Registry
 * 
 * This file manages all icons used in the Discord bot UI.
 * Prepare for Discord Custom Emojis (<:name:id>) by centralizing all icon definitions.
 * 
 * RULES:
 * - Flags: Keep Unicode flags (e.g., 🇻🇳, 🇺🇸) for languages
 * - Branding: Use ✨ for Encore (to be replaced with custom emoji later)
 * - UI Actions: Empty strings for now (clean text-only UI until custom emojis are added)
 */

export const ICONS = {
  // ============================================================================
  // Branding Icons
  // ============================================================================
  
  /** Encore premium badge - TODO: Replace with <:encore:ID> */
  ENCORE: "✨",
  
  // ============================================================================
  // Language Flags (Keep Unicode)
  // These are used in language selectors and displays
  // ============================================================================
  
  FLAG_VN: "🇻🇳",
  FLAG_US: "🇺🇸",
  FLAG_JP: "🇯🇵",
  FLAG_KR: "🇰🇷",
  FLAG_CN: "🇨🇳",
  FLAG_ZA: "🇿🇦",
  FLAG_SA: "🇸🇦",
  FLAG_AM: "🇦🇲",
  FLAG_BD: "🇧🇩",
  FLAG_ES: "🇪🇸",
  FLAG_HR: "🇭🇷",
  FLAG_CZ: "🇨🇿",
  FLAG_DK: "🇩🇰",
  FLAG_NL: "🇳🇱",
  FLAG_PH: "🇵🇭",
  FLAG_FI: "🇫🇮",
  FLAG_FR: "🇫🇷",
  FLAG_DE: "🇩🇪",
  FLAG_GR: "🇬🇷",
  FLAG_IN: "🇮🇳",
  FLAG_HU: "🇭🇺",
  FLAG_IS: "🇮🇸",
  FLAG_ID: "🇮🇩",
  FLAG_IT: "🇮🇹",
  FLAG_KH: "🇰🇭",
  FLAG_LV: "🇱🇻",
  FLAG_NP: "🇳🇵",
  FLAG_NO: "🇳🇴",
  FLAG_PL: "🇵🇱",
  FLAG_BR: "🇧🇷",
  FLAG_RO: "🇷🇴",
  FLAG_RU: "🇷🇺",
  FLAG_RS: "🇷🇸",
  FLAG_LK: "🇱🇰",
  FLAG_SK: "🇸🇰",
  FLAG_TZ: "🇹🇿",
  FLAG_SE: "🇸🇪",
  FLAG_TH: "🇹🇭",
  FLAG_TR: "🇹🇷",
  FLAG_UA: "🇺🇦",
  FLAG_GLOBE: "🌐",

  // ============================================================================
  // UI Action Icons (Clean text-only for now)
  // TODO: Replace with custom Discord emojis when available
  // ============================================================================
  
  /** Configure/Settings - TODO: Replace with <:config:ID> */
  CONFIG: "",
  
  /** Reset action - TODO: Replace with <:reset:ID> */
  RESET: "",
  
  /** Close/Cancel - TODO: Replace with <:close:ID> */
  CLOSE: "",
  
  /** Back/Previous - TODO: Replace with <:back:ID> */
  BACK: "",
  
  /** Next/Forward - TODO: Replace with <:next:ID> */
  NEXT: "",
  
  /** Locked/Unavailable - TODO: Replace with <:lock:ID> */
  LOCKED: "",
  
  /** Success checkmark - TODO: Replace with <:check:ID> */
  SUCCESS: "",
  
  /** Warning/Alert - TODO: Replace with <:warning:ID> */
  WARNING: "",
  
  /** Sound/Audio - TODO: Replace with <:sound:ID> */
  SOUND: "",
  
  /** Voice/Microphone - TODO: Replace with <:mic:ID> */
  VOICE: "",
  
  /** Queue/List - TODO: Replace with <:queue:ID> */
  QUEUE: "",
  
  /** Playing/Now - TODO: Replace with <:playing:ID> */
  PLAYING: "",

  // ============================================================================
  // Status Icons
  // ============================================================================
  
  /** Free tier indicator - TODO: Replace with <:free:ID> */
  FREE_TIER: "",
  
  /** Note/Info indicator - TODO: Replace with <:note:ID> */
  NOTE: "",

} as const;

/**
 * Helper to format icon with text
 * If icon is empty, returns just the text
 */
export function withIcon(icon: string, text: string): string {
  return icon ? `${icon} ${text}` : text;
}

/**
 * Get flag icon for a language code
 */
export function getFlagForLanguage(code: string): string {
  const flagMap: Record<string, string> = {
    vi: ICONS.FLAG_VN,
    en: ICONS.FLAG_US,
    ja: ICONS.FLAG_JP,
    ko: ICONS.FLAG_KR,
    "zh-CN": ICONS.FLAG_CN,
    zh: ICONS.FLAG_CN,
    af: ICONS.FLAG_ZA,
    ar: ICONS.FLAG_SA,
    hy: ICONS.FLAG_AM,
    bn: ICONS.FLAG_BD,
    ca: ICONS.FLAG_ES,
    hr: ICONS.FLAG_HR,
    cs: ICONS.FLAG_CZ,
    da: ICONS.FLAG_DK,
    nl: ICONS.FLAG_NL,
    tl: ICONS.FLAG_PH,
    fi: ICONS.FLAG_FI,
    fr: ICONS.FLAG_FR,
    de: ICONS.FLAG_DE,
    el: ICONS.FLAG_GR,
    hi: ICONS.FLAG_IN,
    hu: ICONS.FLAG_HU,
    is: ICONS.FLAG_IS,
    id: ICONS.FLAG_ID,
    it: ICONS.FLAG_IT,
    jw: ICONS.FLAG_ID,
    km: ICONS.FLAG_KH,
    lv: ICONS.FLAG_LV,
    ml: ICONS.FLAG_IN,
    mr: ICONS.FLAG_IN,
    ne: ICONS.FLAG_NP,
    no: ICONS.FLAG_NO,
    pl: ICONS.FLAG_PL,
    pt: ICONS.FLAG_BR,
    ro: ICONS.FLAG_RO,
    ru: ICONS.FLAG_RU,
    sr: ICONS.FLAG_RS,
    si: ICONS.FLAG_LK,
    sk: ICONS.FLAG_SK,
    es: ICONS.FLAG_ES,
    su: ICONS.FLAG_ID,
    sw: ICONS.FLAG_TZ,
    sv: ICONS.FLAG_SE,
    ta: ICONS.FLAG_IN,
    te: ICONS.FLAG_IN,
    th: ICONS.FLAG_TH,
    tr: ICONS.FLAG_TR,
    uk: ICONS.FLAG_UA,
  };
  
  return flagMap[code] || ICONS.FLAG_GLOBE;
}

export type IconKey = keyof typeof ICONS;
