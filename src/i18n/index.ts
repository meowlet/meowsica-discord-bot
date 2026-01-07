import en from "./locales/en.ts";
import vi from "./locales/vi.ts";

export type Locale = "en" | "vi";

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationObject = { [key: string]: TranslationValue };

const locales: Record<Locale, TranslationObject> = { en, vi };

export const DEFAULT_LOCALE: Locale = "vi";
export const SUPPORTED_LOCALES: Locale[] = ["en", "vi"];

export function getTranslations(locale: Locale | string): TranslationObject {
  if (locale in locales) {
    return locales[locale as Locale];
  }
  return locales[DEFAULT_LOCALE];
}

export function t(
  locale: Locale | string,
  path: string,
  params?: Record<string, string>,
): string {
  const translations = getTranslations(locale);
  const keys = path.split(".");

  let result: unknown = translations;
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }

  let text = typeof result === "string" ? result : path;

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
  }

  return text;
}

export function createTranslator(locale: Locale | string) {
  return (path: string) => t(locale, path);
}
