export type TtsProvider = "basic" | "wavenet";

export interface AudioTuningOptions {
  readonly speakingRate: number;
  readonly pitch: number;
}

export interface TtsPayload {
  readonly text: string;
  readonly language: string;
  readonly provider: TtsProvider;
  readonly url?: string;
  readonly slow?: boolean;
  readonly voiceId?: string | null;
  readonly tuning?: AudioTuningOptions;
}

export interface UserTtsProfile {
  readonly provider: TtsProvider;
  readonly language: string | null;
  readonly voiceId: string | null;
  readonly speed: number;
  readonly pitch: number;
}

export const DEFAULT_USER_TTS_PROFILE: UserTtsProfile = {
  provider: "wavenet",
  language: null,
  voiceId: null,
  speed: 1.0,
  pitch: 0.0,
};
