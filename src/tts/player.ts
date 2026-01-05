/**
 * TTS Player and Queue Management
 *
 * Manages per-guild TTS playback with queue support, audio streaming,
 * and integration with the voice manager.
 */

import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  type AudioPlayer,
  getVoiceConnection,
  StreamType,
} from "@discordjs/voice";
import { Readable } from "node:stream";
import { ttsLogger } from "../utils/logger.ts";
import { createTTSPayloads, type TTSPayload } from "./provider.ts";
import type { VoiceLanguageCode } from "./voices.ts";
import { resetTimeout } from "../voice/manager.ts";

export interface QueueItem {
  /** The payloads to play (may be multiple for long messages) */
  payloads: TTSPayload[];
  /** Current payload index being played */
  currentIndex: number;
  /** User ID who requested this TTS */
  userId: string;
  /** Original message text (for display) */
  originalText: string;
}

interface GuildPlayerState {
  /** Audio player instance */
  player: AudioPlayer;
  /** Message queue */
  queue: QueueItem[];
  /** Whether currently playing */
  isPlaying: boolean;
  /** Current item being played */
  currentItem: QueueItem | null;
}

/** Per-guild player states */
const guildPlayers = new Map<string, GuildPlayerState>();

/**
 * Get or create player state for a guild
 */
function getOrCreateState(guildId: string): GuildPlayerState {
  let state = guildPlayers.get(guildId);

  if (!state) {
    const player = createAudioPlayer();

    state = {
      player,
      queue: [],
      isPlaying: false,
      currentItem: null,
    };

    // Handle player state changes
    player.on(AudioPlayerStatus.Idle, () => {
      handlePlayerIdle(guildId);
    });

    player.on("error", (error) => {
      ttsLogger.error(`Audio player error in guild ${guildId}:`, error);
      handlePlayerIdle(guildId);
    });

    guildPlayers.set(guildId, state);
    ttsLogger.debug(`Created new player state for guild ${guildId}`);
  }

  return state;
}

/**
 * Handle when player becomes idle (finished playing)
 */
function handlePlayerIdle(guildId: string): void {
  const state = guildPlayers.get(guildId);
  if (!state) return;

  const currentItem = state.currentItem;

  // Check if there are more payloads in the current item
  if (currentItem && currentItem.currentIndex < currentItem.payloads.length - 1) {
    currentItem.currentIndex++;
    const nextPayload = currentItem.payloads[currentItem.currentIndex];
    if (nextPayload) {
      playPayload(guildId, nextPayload);
    }
    return;
  }

  // Move to next item in queue
  state.currentItem = null;
  state.isPlaying = false;

  if (state.queue.length > 0) {
    const nextItem = state.queue.shift()!;
    playItem(guildId, nextItem);
  } else {
    ttsLogger.debug(`Queue empty for guild ${guildId}`);
  }
}

/**
 * Play a single TTS payload
 */
async function playPayload(guildId: string, payload: TTSPayload): Promise<void> {
  const state = guildPlayers.get(guildId);
  if (!state) return;

  const connection = getVoiceConnection(guildId);
  if (!connection) {
    ttsLogger.warn(`No voice connection for guild ${guildId}`);
    return;
  }

  try {
    // Fetch audio data from Google TTS
    const response = await fetch(payload.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a Node.js Readable stream from the buffer
    const stream = Readable.from(buffer);

    // Create audio resource from the MP3 data
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    // Subscribe and play
    connection.subscribe(state.player);
    state.player.play(resource);
    state.isPlaying = true;

    // Reset inactivity timeout
    resetTimeout(guildId);

    ttsLogger.debug(`Playing TTS: "${payload.text.slice(0, 30)}..."`);
  } catch (error) {
    ttsLogger.error(`Failed to play TTS payload:`, error);
    // Move to next on error
    handlePlayerIdle(guildId);
  }
}

/**
 * Start playing a queue item
 */
function playItem(guildId: string, item: QueueItem): void {
  const state = guildPlayers.get(guildId);
  if (!state) return;

  state.currentItem = item;
  item.currentIndex = 0;

  const firstPayload = item.payloads[0];
  if (firstPayload) {
    playPayload(guildId, firstPayload);
  }
}

/**
 * Add a TTS message to the queue
 * @returns true if message was queued, false if already playing immediately
 */
export function queueTTS(
  guildId: string,
  text: string,
  language: VoiceLanguageCode,
  userId: string
): { queued: boolean; position: number } {
  const state = getOrCreateState(guildId);
  const payloads = createTTSPayloads(text, language);

  if (payloads.length === 0) {
    return { queued: false, position: -1 };
  }

  const item: QueueItem = {
    payloads,
    currentIndex: 0,
    userId,
    originalText: text,
  };

  // If not currently playing, start immediately
  if (!state.isPlaying && !state.currentItem) {
    playItem(guildId, item);
    return { queued: false, position: 0 };
  }

  // Otherwise add to queue
  state.queue.push(item);
  const position = state.queue.length;

  ttsLogger.debug(
    `Queued TTS for guild ${guildId}, position ${position}: "${text.slice(0, 30)}..."`
  );

  return { queued: true, position };
}

/**
 * Skip the current TTS message
 */
export function skipCurrent(guildId: string): boolean {
  const state = guildPlayers.get(guildId);
  if (!state || !state.isPlaying) {
    return false;
  }

  state.player.stop(true);
  return true;
}

/**
 * Clear the entire queue and stop playback
 */
export function clearQueue(guildId: string): number {
  const state = guildPlayers.get(guildId);
  if (!state) return 0;

  const cleared = state.queue.length + (state.currentItem ? 1 : 0);

  state.queue = [];
  state.currentItem = null;
  state.isPlaying = false;
  state.player.stop(true);

  ttsLogger.debug(`Cleared ${cleared} item(s) from queue in guild ${guildId}`);

  return cleared;
}

/**
 * Get the current queue status
 */
export function getQueueStatus(guildId: string): {
  isPlaying: boolean;
  currentItem: QueueItem | null;
  queueLength: number;
  queue: QueueItem[];
} {
  const state = guildPlayers.get(guildId);

  if (!state) {
    return {
      isPlaying: false,
      currentItem: null,
      queueLength: 0,
      queue: [],
    };
  }

  return {
    isPlaying: state.isPlaying,
    currentItem: state.currentItem,
    queueLength: state.queue.length,
    queue: [...state.queue],
  };
}

/**
 * Clean up player state for a guild (call when disconnecting)
 */
export function cleanupPlayer(guildId: string): void {
  const state = guildPlayers.get(guildId);
  if (state) {
    state.player.stop(true);
    state.queue = [];
    state.currentItem = null;
    state.isPlaying = false;
    guildPlayers.delete(guildId);
    ttsLogger.debug(`Cleaned up player for guild ${guildId}`);
  }
}

/**
 * Check if bot is currently playing in a guild
 */
export function isPlaying(guildId: string): boolean {
  const state = guildPlayers.get(guildId);
  return state?.isPlaying ?? false;
}
