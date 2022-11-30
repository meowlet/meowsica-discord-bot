import type { TtsPayload, TtsProvider, UserTtsProfile } from "./types.ts";
import { sanitizeText, splitText } from "./text-prep.ts";

export interface BuildPayloadsParams {
  readonly text: string;
  readonly language: string;
  readonly profile: UserTtsProfile;
  readonly provider: TtsProvider;
  readonly voiceId?: string | null;
}

export function buildPayloads(params: BuildPayloadsParams): TtsPayload[] {
  const sanitized = sanitizeText(params.text);
  if (!sanitized) return [];
  const segments = splitText(sanitized);
  const isSlow = params.provider === "basic" && params.profile.speed <= 0.25;
  return segments.map((segment) => ({
    text: segment,
    language: params.language,
    provider: params.provider,
    slow: params.provider === "basic" ? isSlow : undefined,
    voiceId: params.voiceId ?? null,
    tuning:
      params.provider === "wavenet"
        ? { speakingRate: params.profile.speed, pitch: params.profile.pitch }
        : undefined,
  }));
}
