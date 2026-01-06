export const Colors = {
  Primary: 0x5865f2,

  Success: 0x57f287,

  Warning: 0xfee75c,

  Error: 0xed4245,
} as const;

export const Timeouts = {
  VoiceReady: 30_000,

  VoiceReconnect: 5_000,
} as const;

export const Defaults = {
  VoiceTimeoutMinutes: "5",
} as const;
