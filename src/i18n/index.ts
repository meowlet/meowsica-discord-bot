import en from "./locales/en.ts";
import vi from "./locales/vi.ts";

export type Locale = "en" | "vi";

// Use a generic object type for translations since each locale has different string values
type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationObject = { [key: string]: TranslationValue };

const locales: Record<Locale, TranslationObject> = { en, vi };

export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES: Locale[] = ["en", "vi"];

/**
 * Get translations for a specific locale
 */
export function getTranslations(locale: Locale | string): TranslationObject {
  if (locale in locales) {
    return locales[locale as Locale];
  }
  return locales[DEFAULT_LOCALE];
}

/**
 * Get a nested translation value by dot-notation path
 * Example: t("en", "commands.ping.title") => "Pong!"
 * Supports template parameters: t("en", "greet", { name: "John" }) => "Hello, John!"
 */
export function t(
  locale: Locale | string,
  path: string,
  params?: Record<string, string>
): string {
  const translations = getTranslations(locale);
  const keys = path.split(".");

  let result: unknown = translations;
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // Return path if translation not found
    }
  }

  let text = typeof result === "string" ? result : path;

  // Replace template parameters like {name} with provided values
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
  }

  return text;
}

/**
 * Create a translator function for a specific locale
 */
export function createTranslator(locale: Locale | string) {
  return (path: string) => t(locale, path);
}
