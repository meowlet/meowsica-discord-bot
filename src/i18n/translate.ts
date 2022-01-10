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
