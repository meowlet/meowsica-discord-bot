// Discord embed colors
export const Colors = {
  /** Discord Blurple - primary/info */
  Primary: 0x5865f2,
  /** Green - success */
  Success: 0x57f287,
  /** Red - error */
  Error: 0xed4245,
} as const;

// Timeouts (in milliseconds)
export const Timeouts = {
  /** Voice connection ready timeout */
  VoiceReady: 30_000,
  /** Voice reconnection timeout */
  VoiceReconnect: 5_000,
} as const;

// Default values
export const Defaults = {
  /** Default voice timeout in minutes */
  VoiceTimeoutMinutes: "5",
} as const;
