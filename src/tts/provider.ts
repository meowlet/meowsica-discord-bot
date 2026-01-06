






import { ttsLogger } from "../utils/logger.ts";
import type { VoiceLanguageCode } from "./voices.ts";

export interface TTSPayload {
  
  url: string;
  
  text: string;
  
  language: VoiceLanguageCode;
}


const MAX_TEXT_LENGTH = 200;


const GOOGLE_TTS_BASE = "https://translate.google.com/translate_tts";




function generateTTSUrl(text: string, language: string): string {
  const params = new URLSearchParams({
    ie: "UTF-8",
    q: text,
    tl: language,
    client: "tw-ob",
    ttsspeed: "1", 
  });

  return `${GOOGLE_TTS_BASE}?${params.toString()}`;
}





function splitText(text: string): string[] {
  
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
      
      .replace(/<@!?\d+>/g, "someone")
      
      .replace(/<#\d+>/g, "a channel")
      
      .replace(/<@&\d+>/g, "a role")
      
      .replace(/<a?:\w+:\d+>/g, "")
      // Remove markdown bold/italic
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      
      .replace(/__([^_]+)__/g, "$1")
      
      .replace(/~~([^~]+)~~/g, "$1")
      
      .replace(/\|\|([^|]+)\|\|/g, "$1")
      
      .replace(/```[\s\S]*?```/g, "code block")
      
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
