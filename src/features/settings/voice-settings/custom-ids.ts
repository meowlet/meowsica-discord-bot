export const VOICE_CUSTOM_IDS = {
  configButton: "btn_voice_config",
  resetButton: "btn_voice_reset",
  languageSelect: "select_voice_language",
  providerSelect: "select_voice_provider",
  variantSelect: "select_voice_variant",
  speedSelect: "select_voice_speed",
  pitchSelect: "select_voice_pitch",
} as const;

const ALL = new Set<string>(Object.values(VOICE_CUSTOM_IDS));

export function isVoiceComponent(customId: string): boolean {
  return ALL.has(customId);
}

export const NAV_NEXT = "NAV_NEXT_PAGE";
export const NAV_PREV = "NAV_PREV_PAGE";
export const LANGUAGES_PER_PAGE = 24;
