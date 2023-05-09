import { toCloudLanguageCode } from "./languages.ts";

export const WAVENET_VOICE_MAP: Readonly<Record<string, string>> = {
  en: "en-US-Wavenet-D",
  vi: "vi-VN-Wavenet-A",
  ja: "ja-JP-Wavenet-B",
  ko: "ko-KR-Wavenet-A",
  fr: "fr-FR-Wavenet-A",
  de: "de-DE-Wavenet-A",
  es: "es-ES-Wavenet-B",
  it: "it-IT-Wavenet-A",
  pt: "pt-BR-Wavenet-A",
  ru: "ru-RU-Wavenet-A",
  cmn: "cmn-CN-Wavenet-A",
  "zh-CN": "cmn-CN-Wavenet-A",
  ar: "ar-XA-Wavenet-A",
  hi: "hi-IN-Wavenet-A",
  id: "id-ID-Wavenet-A",
  nl: "nl-NL-Wavenet-A",
  pl: "pl-PL-Wavenet-A",
  tr: "tr-TR-Wavenet-A",
  th: "th-TH-Standard-A",
  uk: "uk-UA-Wavenet-A",
  cs: "cs-CZ-Wavenet-A",
  da: "da-DK-Wavenet-A",
  el: "el-GR-Wavenet-A",
  fi: "fi-FI-Wavenet-A",
  hu: "hu-HU-Wavenet-A",
  nb: "nb-NO-Wavenet-A",
  no: "nb-NO-Wavenet-A",
  ro: "ro-RO-Wavenet-A",
  sk: "sk-SK-Wavenet-A",
  sv: "sv-SE-Wavenet-A",
  bn: "bn-IN-Wavenet-A",
  ta: "ta-IN-Wavenet-A",
  te: "te-IN-Standard-A",
  ml: "ml-IN-Wavenet-A",
  mr: "mr-IN-Wavenet-A",
  fil: "fil-PH-Wavenet-A",
  tl: "fil-PH-Wavenet-A",
  af: "af-ZA-Standard-A",
  ca: "ca-ES-Standard-A",
  hr: "hr-HR-Standard-A",
  hy: "hy-AM-Standard-A",
  is: "is-IS-Standard-A",
  jv: "jv-ID-Standard-A",
  jw: "jv-ID-Standard-A",
  km: "km-KH-Standard-A",
  lv: "lv-LV-Standard-A",
  ne: "ne-NP-Standard-A",
  si: "si-LK-Standard-A",
  sr: "sr-RS-Standard-A",
  su: "su-ID-Standard-A",
  sw: "sw-KE-Standard-A",
};

export function getDefaultWavenetVoice(languageCode: string): string {
  const direct = WAVENET_VOICE_MAP[languageCode];
  if (direct) return direct;
  const cloud = toCloudLanguageCode(languageCode);
  const cloudPrefix = cloud.split("-").slice(0, 2).join("-");
  return `${cloudPrefix}-Standard-A`;
}

export function extractLanguageCodeFromVoice(voiceName: string): string {
  const parts = voiceName.split("-");
  if (parts.length >= 2) return `${parts[0]}-${parts[1]}`;
  return parts[0] ?? "en-US";
}
