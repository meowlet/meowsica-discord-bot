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
  payloads: TTSPayload[];

  currentIndex: number;

  userId: string;

  originalText: string;
}

interface GuildPlayerState {
  player: AudioPlayer;

  queue: QueueItem[];

  isPlaying: boolean;

  currentItem: QueueItem | null;
}

const guildPlayers = new Map<string, GuildPlayerState>();

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

    player.on(AudioPlayerStatus.Idle, () => {
      handlePlayerIdle(guildId);
    });

    player.on("error", (error) => {
      ttsLogger.error(`Audio player error in guild ${guildId}:`, error);
      handlePlayerIdle(guildId);
    });

    guildPlayers.set(guildId, state);
  }

  return state;
}

function handlePlayerIdle(guildId: string): void {
  const state = guildPlayers.get(guildId);
  if (!state) return;

  const currentItem = state.currentItem;

  if (
    currentItem &&
    currentItem.currentIndex < currentItem.payloads.length - 1
  ) {
    currentItem.currentIndex++;
    const nextPayload = currentItem.payloads[currentItem.currentIndex];
    if (nextPayload) {
      playPayload(guildId, nextPayload);
    }
    return;
  }

  state.currentItem = null;
  state.isPlaying = false;

  if (state.queue.length > 0) {
    const nextItem = state.queue.shift()!;
    playItem(guildId, nextItem);
  }
}

async function playPayload(
  guildId: string,
  payload: TTSPayload,
): Promise<void> {
  const state = guildPlayers.get(guildId);
  if (!state) return;

  const connection = getVoiceConnection(guildId);
  if (!connection) {
    ttsLogger.warn(`No voice connection for guild ${guildId}`);
    return;
  }

  try {
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

    const stream = Readable.from(buffer);

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    connection.subscribe(state.player);
    state.player.play(resource);
    state.isPlaying = true;

    resetTimeout(guildId);
  } catch (error) {
    ttsLogger.error(`Failed to play TTS payload:`, error);

    handlePlayerIdle(guildId);
  }
}

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

export function queueTTS(
  guildId: string,
  text: string,
  language: VoiceLanguageCode,
  userId: string,
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

  if (!state.isPlaying && !state.currentItem) {
    playItem(guildId, item);
    return { queued: false, position: 0 };
  }

  state.queue.push(item);
  const position = state.queue.length;

  return { queued: true, position };
}

export function skipCurrent(guildId: string): boolean {
  const state = guildPlayers.get(guildId);
  if (!state || !state.isPlaying) {
    return false;
  }

  state.player.stop(true);
  return true;
}

export function clearQueue(guildId: string): number {
  const state = guildPlayers.get(guildId);
  if (!state) return 0;

  const cleared = state.queue.length + (state.currentItem ? 1 : 0);

  state.queue = [];
  state.currentItem = null;
  state.isPlaying = false;
  state.player.stop(true);

  return cleared;
}

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

export function cleanupPlayer(guildId: string): void {
  const state = guildPlayers.get(guildId);
  if (state) {
    state.player.stop(true);
    state.queue = [];
    state.currentItem = null;
    state.isPlaying = false;
    guildPlayers.delete(guildId);
  }
}

export function isPlaying(guildId: string): boolean {
  const state = guildPlayers.get(guildId);
  return state?.isPlaying ?? false;
}
