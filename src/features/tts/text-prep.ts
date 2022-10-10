export const MAX_SAY_LENGTH = 500;
const MAX_SEGMENT_LENGTH = 200;
const SANITIZE_HARD_INPUT_CAP = 4_000;

export function sanitizeText(text: string): string {
  const capped =
    text.length > SANITIZE_HARD_INPUT_CAP
      ? text.slice(0, SANITIZE_HARD_INPUT_CAP)
      : text;
  return capped
    .replace(/```[\s\S]*?```/g, "code block")
    .replace(/https?:\/\/\S+/gi, "link")
    .replace(/<@!?\d+>/g, "someone")
    .replace(/<#\d+>/g, "a channel")
    .replace(/<@&\d+>/g, "a role")
    .replace(/<a?:\w+:\d+>/g, "")
    .replace(/\*{1,3}([^*\n]+?)\*{1,3}/g, "$1")
    .replace(/__([^_\n]+?)__/g, "$1")
    .replace(/~~([^~\n]+?)~~/g, "$1")
    .replace(/\|\|([^|\n]+?)\|\|/g, "$1")
    .replace(/`([^`\n]+?)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitText(text: string): string[] {
  if (text.length <= MAX_SEGMENT_LENGTH) return [text];
  const segments: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > MAX_SEGMENT_LENGTH) {
      if (current) {
        segments.push(current.trim());
        current = "";
      }
      pushLongSentence(sentence, segments);
      continue;
    }
    if (current.length + sentence.length + 1 <= MAX_SEGMENT_LENGTH) {
      current += (current ? " " : "") + sentence;
      continue;
    }
    if (current) segments.push(current.trim());
    current = sentence;
  }
  if (current) segments.push(current.trim());
  return segments.filter((s) => s.length > 0);
}

function pushLongSentence(sentence: string, segments: string[]): void {
  const parts = sentence.split(/(?<=[,])\s+/);
  let current = "";
  for (const part of parts) {
    if (part.length > MAX_SEGMENT_LENGTH) {
      if (current) {
        segments.push(current.trim());
        current = "";
      }
      for (let i = 0; i < part.length; i += MAX_SEGMENT_LENGTH) {
        segments.push(part.slice(i, i + MAX_SEGMENT_LENGTH).trim());
      }
      continue;
    }
    if (current.length + part.length + 1 <= MAX_SEGMENT_LENGTH) {
      current += (current ? " " : "") + part;
      continue;
    }
    if (current) segments.push(current.trim());
    current = part;
  }
  if (current) segments.push(current.trim());
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly sanitized: string;
  readonly error?: "empty" | "too_long";
}

export function validateText(text: string): ValidationResult {
  const sanitized = sanitizeText(text);
  if (!sanitized) return { valid: false, sanitized: "", error: "empty" };
  if (sanitized.length > MAX_SAY_LENGTH) {
    return { valid: false, sanitized, error: "too_long" };
  }
  return { valid: true, sanitized };
}
