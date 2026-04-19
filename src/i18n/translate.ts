import en from "./locales/en.ts";
import vi from "./locales/vi.ts";

export type Locale = "en" | "vi";

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationObject = { [key: string]: TranslationValue };

const locales: Record<Locale, TranslationObject> = { en, vi };

export const DEFAULT_LOCALE: Locale = "vi";
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "vi"] as const;

export function isSupportedLocale(value: string): value is Locale {
  return value === "en" || value === "vi";
}

export function getTranslations(locale: Locale | string): TranslationObject {
  if (isSupportedLocale(locale)) return locales[locale];
  return locales[DEFAULT_LOCALE];
}

export interface TranslateParams {
  readonly [key: string]: string | number;
}

export function t(
  locale: Locale | string,
  path: string,
  params?: TranslateParams,
): string {
  const translations = getTranslations(locale);
  const keys = path.split(".");
  let result: unknown = translations;
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
      continue;
    }
    return path;
  }
  if (typeof result !== "string") return path;
  if (!params) return result;
  return interpolate(result, params);
}

function interpolate(template: string, params: TranslateParams): string {
  let output = template;
  for (const [key, value] of Object.entries(params)) {
    output = output.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return output;
}

export type Translator = (path: string, params?: TranslateParams) => string;

export function createTranslator(locale: Locale | string): Translator {
  return (path, params) => t(locale, path, params);
}
