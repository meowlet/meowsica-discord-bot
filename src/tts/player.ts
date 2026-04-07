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
import {
  createTTSPayloads,
  synthesizeWavenet,
  synthesizeWavenetCached,
  isWavenetAvailable,
  QuotaExceededError,
  type TTSPayload,
  type TTSProviderType,
  type AudioTuningOptions,
} from "./provider.ts";
import type { VoiceLanguageCode } from "./voices.ts";
import { resetTimeout } from "../voice/manager.ts";
import { getUserTTSProfile } from "../settings/db.ts";

export interface QueueItem {
  payloads: TTSPayload[];
  currentIndex: number;
  userId: string;
  originalText: string;
  isEncoreMode: boolean;
  voiceName?: string | null;
  /** Audio tuning for Premium provider (speed/pitch) */
  tuning?: AudioTuningOptions;
}

/** Re-export QuotaExceededError for consumers */
export { QuotaExceededError } from "./provider.ts";

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
      playPayload(guildId, nextPayload, currentItem.userId, currentItem.tuning).catch((error) => {
        if (error instanceof QuotaExceededError) {
          ttsLogger.warn(`Quota exceeded for user ${currentItem.userId} during playback: ${error.message}`);
        } else {
          ttsLogger.error(`Error playing payload in guild ${guildId}:`, error);
        }
        // Clear current item and continue with queue
        state.currentItem = null;
        state.isPlaying = false;
        handlePlayerIdle(guildId);
      });
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

async function playPayloadPremium(
  guildId: string,
  payload: TTSPayload,
  state: GuildPlayerState,
  userId: string,
  tuning?: AudioTuningOptions,
): Promise<boolean> {
  // Use cached synthesis with quota management
  const result = await synthesizeWavenetCached(
    payload.text,
    payload.language,
    userId,
    payload.voiceName,
    tuning,
  );
  
  if (!result) {
    return false;
  }
  
  const { buffer: audioBuffer, fromCache } = result;
  if (fromCache) {
    ttsLogger.debug(`[Player] Using cached audio for guild ${guildId}`);
  }
  
  const connection = getVoiceConnection(guildId);
  if (!connection) {
    ttsLogger.warn(`No voice connection for guild ${guildId}`);
    return false;
  }
  const stream = Readable.from(audioBuffer);
  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
  });
  connection.subscribe(state.player);
  state.player.play(resource);
  state.isPlaying = true;
  resetTimeout(guildId);
  return true;
}

async function playPayloadBasic(
  guildId: string,
  payload: TTSPayload,
  state: GuildPlayerState,
): Promise<boolean> {
  const connection = getVoiceConnection(guildId);
  if (!connection) {
    ttsLogger.warn(`No voice connection for guild ${guildId}`);
    return false;
  }
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
  return true;
}

async function playPayload(
  guildId: string,
  payload: TTSPayload,
  userId: string,
  tuning?: AudioTuningOptions,
): Promise<void> {
  const state = guildPlayers.get(guildId);
  if (!state) return;
  try {
    if (payload.provider === "premium") {
      const success = await playPayloadPremium(guildId, payload, state, userId, tuning);
      if (!success) {
        ttsLogger.warn("Premium (Wavenet) failed, falling back to basic TTS");
        await playPayloadBasic(guildId, payload, state);
      }
    } else {
      await playPayloadBasic(guildId, payload, state);
    }
  } catch (error) {
    // Re-throw QuotaExceededError to be handled at the queue level
    if (error instanceof QuotaExceededError) {
      throw error;
    }
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
    playPayload(guildId, firstPayload, item.userId, item.tuning).catch((error) => {
      if (error instanceof QuotaExceededError) {
        ttsLogger.warn(`Quota exceeded for user ${item.userId} during playback: ${error.message}`);
      } else {
        ttsLogger.error(`Error playing payload in guild ${guildId}:`, error);
      }
      // Clear current item and continue with queue
      state.currentItem = null;
      state.isPlaying = false;
      handlePlayerIdle(guildId);
    });
  }
}

export interface QueueTTSResult {
  queued: boolean;
  position: number;
  isEncoreMode: boolean;
  provider: TTSProviderType;
  providerLabel: string;
  modelLabel: string;
}

export interface QueueTTSOptions {
  guildId: string;
  text: string;
  language: VoiceLanguageCode;
  userId: string;
  overrideVoiceName?: string | null;
}

export function queueTTS(
  guildId: string,
  text: string,
  language: VoiceLanguageCode,
  userId: string,
  overrideVoiceName?: string | null,
): QueueTTSResult {
  const state = getOrCreateState(guildId);
  const profile = getUserTTSProfile(userId);
  const voiceName = overrideVoiceName ?? profile.voiceId;
  const usePremium = isWavenetAvailable() && profile.provider === "premium";
  const provider: TTSProviderType = usePremium ? "premium" : "basic";
  const effectiveVoiceName = usePremium ? voiceName : null;
  const providerLabel = usePremium ? "Encore" : "Basic";
  const modelLabel = effectiveVoiceName || "N/A";
  
  // Pass speed to createTTSPayloads (used for Basic provider slow mode detection)
  const payloads = createTTSPayloads(text, language, provider, effectiveVoiceName, profile.speed);
  if (payloads.length === 0) {
    return {
      queued: false,
      position: -1,
      isEncoreMode: false,
      provider: "basic",
      providerLabel: "Google Translate",
      modelLabel: "N/A",
    };
  }
  
  // Build tuning options for Premium provider
  const tuning: AudioTuningOptions | undefined = usePremium
    ? { speakingRate: profile.speed, pitch: profile.pitch }
    : undefined;
  
  const item: QueueItem = {
    payloads,
    currentIndex: 0,
    userId,
    originalText: text,
    isEncoreMode: usePremium,
    voiceName: effectiveVoiceName,
    tuning,
  };
  if (!state.isPlaying && !state.currentItem) {
    playItem(guildId, item);
    return {
      queued: false,
      position: 0,
      isEncoreMode: usePremium,
      provider,
      providerLabel,
      modelLabel,
    };
  }
  state.queue.push(item);
  const position = state.queue.length;
  return {
    queued: true,
    position,
    isEncoreMode: usePremium,
    provider,
    providerLabel,
    modelLabel,
  };
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
