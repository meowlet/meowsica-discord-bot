/**
 * Google TTS Provider
 *
 * Generates TTS audio URLs using Google Translate's unofficial TTS API.
 * This approach mirrors the legacy bot's use of the google-tts-api package.
 */

import { ttsLogger } from "../utils/logger.ts";
import type { VoiceLanguageCode } from "./voices.ts";

export interface TTSPayload {
  /** URL to the audio file */
  url: string;
  /** The text being spoken */
  text: string;
  /** Language code used */
  language: VoiceLanguageCode;
}

/** Maximum text length per TTS request (Google limit) */
const MAX_TEXT_LENGTH = 200;

/** Google TTS API base URL */
const GOOGLE_TTS_BASE = "https://translate.google.com/translate_tts";

/**
 * Generate Google TTS audio URL for a text segment
 */
function generateTTSUrl(text: string, language: string): string {
  const params = new URLSearchParams({
    ie: "UTF-8",
    q: text,
    tl: language,
    client: "tw-ob",
    ttsspeed: "1", // Normal speed
  });

  return `${GOOGLE_TTS_BASE}?${params.toString()}`;
}

/**
 * Split text into segments that fit within Google TTS limits
 * Splits on sentence boundaries when possible
 */
function splitText(text: string): string[] {
  // If text is short enough, return as-is
  if (text.length <= MAX_TEXT_LENGTH) {
    return [text];
  }

  const segments: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentSegment = "";

  for (const sentence of sentences) {
    // If a single sentence is too long, split it further
    if (sentence.length > MAX_TEXT_LENGTH) {
      // Flush current segment first
      if (currentSegment) {
        segments.push(currentSegment.trim());
        currentSegment = "";
      }

      // Split long sentence by commas or spaces
      const parts = sentence.split(/(?<=[,])\s+/);
      for (const part of parts) {
        if (part.length > MAX_TEXT_LENGTH) {
          // Last resort: split by max length
          for (let i = 0; i < part.length; i += MAX_TEXT_LENGTH) {
            segments.push(part.slice(i, i + MAX_TEXT_LENGTH).trim());
          }
        } else if (currentSegment.length + part.length + 1 <= MAX_TEXT_LENGTH) {
          currentSegment += (currentSegment ? " " : "") + part;
        } else {
          if (currentSegment) {
            segments.push(currentSegment.trim());
          }
          currentSegment = part;
        }
      }
    } else if (currentSegment.length + sentence.length + 1 <= MAX_TEXT_LENGTH) {
      // Can fit in current segment
      currentSegment += (currentSegment ? " " : "") + sentence;
    } else {
      // Start new segment
      if (currentSegment) {
        segments.push(currentSegment.trim());
      }
      currentSegment = sentence;
    }
  }

  // Don't forget the last segment
  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  return segments.filter((s) => s.length > 0);
}

/**
 * Sanitize text for TTS
 * - Removes URLs (replaced with indicator)
 * - Cleans up Discord formatting
 * - Removes excessive whitespace
 */
function sanitizeText(text: string): string {
  return (
    text
      // Replace URLs with a spoken indicator
      .replace(/https?:\/\/[^\s]+/gi, "link")
      // Remove Discord user mentions <@123>
      .replace(/<@!?\d+>/g, "someone")
      // Remove Discord channel mentions <#123>
      .replace(/<#\d+>/g, "a channel")
      // Remove Discord role mentions <@&123>
      .replace(/<@&\d+>/g, "a role")
      // Remove Discord custom emojis <:name:123>
      .replace(/<a?:\w+:\d+>/g, "")
      // Remove markdown bold/italic
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      // Remove markdown underline
      .replace(/__([^_]+)__/g, "$1")
      // Remove markdown strikethrough
      .replace(/~~([^~]+)~~/g, "$1")
      // Remove markdown spoiler
      .replace(/\|\|([^|]+)\|\|/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "code block")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Collapse multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Create TTS payloads for a message
 * Returns multiple payloads if the text needs to be split
 */
export function createTTSPayloads(
  text: string,
  language: VoiceLanguageCode
): TTSPayload[] {
  const sanitized = sanitizeText(text);

  if (!sanitized) {
    return [];
  }

  const segments = splitText(sanitized);

  ttsLogger.debug(
    `Created ${segments.length} TTS segment(s) for "${sanitized.slice(0, 50)}..."`
  );

  return segments.map((segment) => ({
    url: generateTTSUrl(segment, language),
    text: segment,
    language,
  }));
}

/**
 * Validate that text can be converted to TTS
 */
export function validateTTSText(text: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  const sanitized = sanitizeText(text);

  if (!sanitized) {
    return {
      valid: false,
      sanitized: "",
      error: "Message is empty after removing URLs and formatting.",
    };
  }

  // Maximum total length (generous limit)
  if (sanitized.length > 2000) {
    return {
      valid: false,
      sanitized,
      error: "Message is too long.",
    };
  }

  return {
    valid: true,
    sanitized,
  };
}
