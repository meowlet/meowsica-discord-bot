import en from "./locales/en.ts";
import vi from "./locales/vi.ts";
import type { Messages } from "./locales/en.ts";

export type Locale = "en" | "vi";

const locales: Record<Locale, Messages> = { en, vi };

export const DEFAULT_LOCALE: Locale = "vi";
export const FALLBACK_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "vi"] as const;

const IS_DEV = process.env["NODE_ENV"] !== "production";
const warnedMissingKeys = new Set<string>();

type Primitive = string | number | boolean | null | undefined;

type Join<K, P> = K extends string
  ? P extends string
    ? `${K}.${P}`
    : never
  : never;

type LeafPaths<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : Join<K, LeafPaths<T[K]>>;
    }[keyof T & string];

export type TranslationKey = LeafPaths<Messages>;

export function isSupportedLocale(value: string): value is Locale {
  return value === "en" || value === "vi";
}

export function getTranslations(locale: Locale | string): Messages {
  if (isSupportedLocale(locale)) return locales[locale];
  return locales[DEFAULT_LOCALE];
}

export interface TranslateParams {
  readonly [key: string]: string | number;
}

export function t(
  locale: Locale | string,
  path: TranslationKey | (string & {}),
  params?: TranslateParams,
): string {
  const resolved =
    lookup(getTranslations(locale), path) ??
    lookup(locales[FALLBACK_LOCALE], path);
  if (typeof resolved !== "string") {
    warnMissingKey(path);
    return path;
  }
  return params ? interpolate(resolved, params) : resolved;
}

function warnMissingKey(path: string): void {
  if (!IS_DEV) return;
  if (warnedMissingKeys.has(path)) return;
  warnedMissingKeys.add(path);
  // eslint-disable-next-line no-console
  console.warn(`[i18n] missing translation key: ${path}`);
}

function lookup(root: Messages, path: string): unknown {
  const keys = path.split(".");
  let cursor: unknown = root;
  for (const key of keys) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
    if (cursor === undefined) return undefined;
  }
  return cursor;
}

function interpolate(template: string, params: TranslateParams): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, key)) return match;
    return String(params[key]);
  });
}

export type Translator = (
  path: TranslationKey | (string & {}),
  params?: TranslateParams,
) => string;

export function createTranslator(locale: Locale | string): Translator {
  return (path, params) => t(locale, path, params);
}

