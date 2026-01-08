export type TTSProviderType = "basic" | "premium";

export type SsmlVoiceGender = "SSML_VOICE_GENDER_UNSPECIFIED" | "MALE" | "FEMALE" | "NEUTRAL";

export interface GoogleVoice {
  languageCodes: string[];
  name: string;
  ssmlGender: SsmlVoiceGender;
  naturalSampleRateHertz: number;
}

export interface GoogleVoiceListResponse {
  voices: GoogleVoice[];
}

export interface VoiceOption {
  name: string;
  value: string;
  languageCode: string;
  gender: SsmlVoiceGender;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName?: string;
}

export interface UserVoicePreferences {
  provider: TTSProviderType;
  voiceName: string | null;
  languageCode: string;
}
