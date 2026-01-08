export const Colors = {
  // Material Design Pastel Colors
  Primary: 0x7986cb, // Indigo 300
  Blurple: 0x9fa8da, // Indigo 200
  Encore: 0xffe082, // Amber 200

  Success: 0xa5d6a7, // Green 200

  Warning: 0xfff59d, // Yellow 200

  Error: 0xef9a9a, // Red 200
} as const;

export const Timeouts = {
  VoiceReady: 30_000,

  VoiceReconnect: 5_000,
} as const;

export const Defaults = {
  VoiceTimeoutMinutes: "5",
} as const;
