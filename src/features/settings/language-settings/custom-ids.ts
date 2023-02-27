export const LANGUAGE_CUSTOM_IDS = {
  configButton: "btn_language_config",
  closeButton: "btn_language_close",
  userSelect: "select_user_language",
  serverSelect: "select_server_language",
} as const;

const ALL = new Set<string>(Object.values(LANGUAGE_CUSTOM_IDS));

export function isLanguageComponent(customId: string): boolean {
  return ALL.has(customId);
}
