import { toBasicLanguageCode } from "../features/tts/languages.ts";

const GOOGLE_TRANSLATE_TTS_BASE = "https://translate.google.com/translate_tts";

export interface TranslateTtsParams {
  readonly text: string;
  readonly language: string;
  readonly slow?: boolean;
}

export function buildTranslateTtsUrl(params: TranslateTtsParams): string {
  const shortLang = toBasicLanguageCode(params.language);
  const search = new URLSearchParams({
    ie: "UTF-8",
    q: params.text,
    tl: shortLang,
    client: "tw-ob",
    ttsspeed: params.slow ? "0.24" : "1",
  });
  return `${GOOGLE_TRANSLATE_TTS_BASE}?${search.toString()}`;
}
