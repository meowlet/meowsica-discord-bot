import {
  AudioPlayerStatus,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  type AudioPlayer,
} from "@discordjs/voice";
import { Readable } from "node:stream";
import type { Logger } from "../../shared/logger.ts";
import { QuotaExceededError } from "../../shared/errors.ts";
import type { UserPrefsRepository } from "../settings/user-prefs-repo.ts";
import type { VoiceManager } from "../voice/voice-manager.ts";
import type { BasicTtsProvider } from "./basic-provider.ts";
import type { WavenetTtsProvider } from "./wavenet-provider.ts";
import { buildPayloads } from "./payload-builder.ts";
import type { TtsPayload, TtsProvider } from "./types.ts";

export interface QueueItem {
  readonly payloads: TtsPayload[];
  currentIndex: number;
  readonly userId: string;
  readonly originalText: string;
  readonly provider: TtsProvider;
  readonly voiceName: string | null;
}

interface GuildPlayerState {
  player: AudioPlayer;
  queue: QueueItem[];
  isPlaying: boolean;
  currentItem: QueueItem | null;
}

export interface QueueResult {
  readonly queued: boolean;
  readonly position: number;
  readonly provider: TtsProvider;
  readonly providerLabel: string;
  readonly modelLabel: string;
}

export interface QueueParams {
  readonly guildId: string;
  readonly text: string;
  readonly language: string;
  readonly userId: string;
}

export interface PlayerManagerDeps {
  readonly logger: Logger;
  readonly userPrefs: UserPrefsRepository;
  readonly basic: BasicTtsProvider;
  readonly wavenet: WavenetTtsProvider;
  readonly voice: VoiceManager;
}

export class PlayerManager {
  private readonly logger: Logger;
  private readonly userPrefs: UserPrefsRepository;
  private readonly basic: BasicTtsProvider;
  private readonly wavenet: WavenetTtsProvider;
  private readonly voice: VoiceManager;
  private readonly players = new Map<string, GuildPlayerState>();

  constructor(deps: PlayerManagerDeps) {
    this.logger = deps.logger.withTag("PLAYER");
    this.userPrefs = deps.userPrefs;
    this.basic = deps.basic;
    this.wavenet = deps.wavenet;
    this.voice = deps.voice;
  }

  async queue(params: QueueParams): Promise<QueueResult> {
    const prefs = await this.userPrefs.getOrDefault(params.userId);
    const useWavenet =
      this.wavenet.isAvailable() && prefs.tts.provider === "wavenet";
    const provider: TtsProvider = useWavenet ? "wavenet" : "basic";
    const voiceId = useWavenet
      ? this.wavenet.resolveVoice(params.language, prefs.tts.voiceId)
      : null;
    const payloads = buildPayloads({
      text: params.text,
      language: params.language,
      profile: prefs.tts,
      provider,
      voiceId,
    });
    const providerLabel = useWavenet ? "Wavenet" : "Basic";
    const modelLabel = voiceId ?? "N/A";
    if (payloads.length === 0) {
      return {
        queued: false,
        position: -1,
        provider: "basic",
        providerLabel: "Google Translate",
        modelLabel: "N/A",
      };
    }
    const item: QueueItem = {
      payloads,
      currentIndex: 0,
      userId: params.userId,
      originalText: params.text,
      provider,
      voiceName: voiceId,
    };
    const state = this.getOrCreateState(params.guildId);
    this.logger.info("TTS request", {
      provider: providerLabel,
      ...(voiceId && { model: voiceId }),
      language: params.language,
      chars: params.text.length,
    });
    if (!state.isPlaying && !state.currentItem) {
      this.playItem(params.guildId, item);
      return {
        queued: false,
        position: 0,
        provider,
        providerLabel,
        modelLabel,
      };
    }
    state.queue.push(item);
    return {
      queued: true,
      position: state.queue.length,
      provider,
      providerLabel,
      modelLabel,
    };
  }

  skip(guildId: string): boolean {
    const state = this.players.get(guildId);
    if (!state || !state.isPlaying) return false;
    state.player.stop(true);
    return true;
  }

  clear(guildId: string): number {
    const state = this.players.get(guildId);
    if (!state) return 0;
    const cleared = state.queue.length + (state.currentItem ? 1 : 0);
    state.queue = [];
    state.currentItem = null;
    state.isPlaying = false;
    state.player.stop(true);
    return cleared;
  }

  getStatus(guildId: string): {
    isPlaying: boolean;
    currentItem: QueueItem | null;
    queueLength: number;
    queue: QueueItem[];
  } {
    const state = this.players.get(guildId);
    if (!state) {
      return { isPlaying: false, currentItem: null, queueLength: 0, queue: [] };
    }
    return {
      isPlaying: state.isPlaying,
      currentItem: state.currentItem,
      queueLength: state.queue.length,
      queue: [...state.queue],
    };
  }

  cleanup(guildId: string): void {
    const state = this.players.get(guildId);
    if (!state) return;
    state.player.stop(true);
    state.queue = [];
    state.currentItem = null;
    state.isPlaying = false;
    this.players.delete(guildId);
  }

  isPlaying(guildId: string): boolean {
    return this.players.get(guildId)?.isPlaying ?? false;
  }

  getActiveGuildCount(): number {
    return this.players.size;
  }

  cleanupIdle(): number {
    let cleaned = 0;
    for (const [guildId, state] of this.players) {
      if (!state.isPlaying && !state.currentItem && state.queue.length === 0) {
        state.player.stop(true);
        this.players.delete(guildId);
        cleaned++;
      }
    }
    return cleaned;
  }

  shutdown(): void {
    for (const [guildId, state] of this.players) {
      try {
        state.player.stop(true);
      } catch {
        // ignore
      }
      this.players.delete(guildId);
    }
  }

  private getOrCreateState(guildId: string): GuildPlayerState {
    let state = this.players.get(guildId);
    if (state) return state;
    const player = createAudioPlayer();
    state = { player, queue: [], isPlaying: false, currentItem: null };
    player.on(AudioPlayerStatus.Idle, () => this.handleIdle(guildId));
    player.on("error", (err) => {
      this.logger.error(`audio player error guild=${guildId}`, err);
      this.handleIdle(guildId);
    });
    this.players.set(guildId, state);
    return state;
  }

  private handleIdle(guildId: string): void {
    const state = this.players.get(guildId);
    if (!state) return;
    const current = state.currentItem;
    if (current && current.currentIndex < current.payloads.length - 1) {
      current.currentIndex++;
      const nextPayload = current.payloads[current.currentIndex];
      if (nextPayload) {
        this.playPayload(guildId, nextPayload, current.userId).catch((err) =>
          this.handlePlaybackError(guildId, current.userId, err),
        );
      }
      return;
    }
    state.currentItem = null;
    state.isPlaying = false;
    if (state.queue.length > 0) {
      const next = state.queue.shift();
      if (next) this.playItem(guildId, next);
    }
  }

  private playItem(guildId: string, item: QueueItem): void {
    const state = this.players.get(guildId);
    if (!state) return;
    state.currentItem = item;
    item.currentIndex = 0;
    const first = item.payloads[0];
    if (!first) return;
    this.playPayload(guildId, first, item.userId).catch((err) =>
      this.handlePlaybackError(guildId, item.userId, err),
    );
  }

  private async playPayload(
    guildId: string,
    payload: TtsPayload,
    userId: string,
  ): Promise<void> {
    const state = this.players.get(guildId);
    if (!state) return;
    try {
      if (payload.provider === "wavenet") {
        const ok = await this.playWavenet(guildId, payload, state, userId);
        if (!ok) {
          this.logger.warn("wavenet failed, falling back to basic");
          await this.playBasic(guildId, payload, state);
        }
        return;
      }
      await this.playBasic(guildId, payload, state);
    } catch (err) {
      if (err instanceof QuotaExceededError) throw err;
      this.logger.error("failed to play payload", err);
      this.handleIdle(guildId);
    }
  }

  private async playWavenet(
    guildId: string,
    payload: TtsPayload,
    state: GuildPlayerState,
    userId: string,
  ): Promise<boolean> {
    const result = await this.wavenet.synthesize({
      text: payload.text,
      language: payload.language,
      userId,
      voiceId: payload.voiceId,
      speakingRate: payload.tuning?.speakingRate ?? 1.0,
      pitch: payload.tuning?.pitch ?? 0.0,
    });
    if (!result) return false;
    return this.startPlayback(guildId, state, result.buffer);
  }

  private async playBasic(
    guildId: string,
    payload: TtsPayload,
    state: GuildPlayerState,
  ): Promise<boolean> {
    const buffer = await this.basic.fetchAudio({
      text: payload.text,
      language: payload.language,
      slow: payload.slow,
    });
    if (!buffer) return false;
    return this.startPlayback(guildId, state, buffer);
  }

  private startPlayback(
    guildId: string,
    state: GuildPlayerState,
    buffer: Buffer,
  ): boolean {
    const connection = getVoiceConnection(guildId);
    if (!connection) {
      this.logger.warn(`no voice connection for guild ${guildId}`);
      return false;
    }
    const resource = createAudioResource(Readable.from(buffer), {
      inputType: StreamType.Arbitrary,
    });
    connection.subscribe(state.player);
    state.player.play(resource);
    state.isPlaying = true;
    this.voice.resetTimeout(guildId);
    return true;
  }

  private handlePlaybackError(
    guildId: string,
    userId: string,
    err: unknown,
  ): void {
    if (err instanceof QuotaExceededError) {
      this.logger.warn(
        `quota exceeded user=${userId} during playback: ${err.message}`,
      );
    } else {
      this.logger.error(`playback error guild=${guildId}`, err);
    }
    const state = this.players.get(guildId);
    if (state) {
      state.currentItem = null;
      state.isPlaying = false;
    }
    this.handleIdle(guildId);
  }
}
