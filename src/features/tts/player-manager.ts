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

const MAX_QUEUE_SIZE_PER_GUILD = 20;
const USER_THROTTLE_MS = 2_000;
const THROTTLE_CLEANUP_INTERVAL_MS = 5 * 60_000;

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
  starting: boolean;
}

export type QueueRejection = "queue_full" | "empty_payload";

export interface QueueResult {
  readonly queued: boolean;
  readonly position: number;
  readonly provider: TtsProvider;
  readonly providerLabel: string;
  readonly modelLabel: string;
  readonly rejection?: QueueRejection;
}

export interface ThrottleAcquisition {
  readonly ok: boolean;
  readonly retryAfterMs?: number;
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
  readonly maxQueueSizePerGuild?: number;
  readonly userThrottleMs?: number;
}

export class PlayerManager {
  private readonly logger: Logger;
  private readonly userPrefs: UserPrefsRepository;
  private readonly basic: BasicTtsProvider;
  private readonly wavenet: WavenetTtsProvider;
  private readonly voice: VoiceManager;
  private readonly players = new Map<string, GuildPlayerState>();
  private readonly userThrottle = new Map<string, number>();
  private readonly maxQueueSize: number;
  private readonly throttleMs: number;
  private throttleCleanupTimer: ReturnType<typeof setInterval> | null;

  constructor(deps: PlayerManagerDeps) {
    this.logger = deps.logger.withTag("PLAYER");
    this.userPrefs = deps.userPrefs;
    this.basic = deps.basic;
    this.wavenet = deps.wavenet;
    this.voice = deps.voice;
    this.maxQueueSize = deps.maxQueueSizePerGuild ?? MAX_QUEUE_SIZE_PER_GUILD;
    this.throttleMs = deps.userThrottleMs ?? USER_THROTTLE_MS;
    this.throttleCleanupTimer = setInterval(
      () => this.pruneThrottleMap(),
      THROTTLE_CLEANUP_INTERVAL_MS,
    );
    if (typeof this.throttleCleanupTimer.unref === "function") {
      this.throttleCleanupTimer.unref();
    }
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
    if (payloads.length === 0) return this.rejection("empty_payload");
    const state = this.getOrCreateState(params.guildId);
    if (state.queue.length >= this.maxQueueSize) {
      return this.rejection("queue_full");
    }
    const item: QueueItem = {
      payloads,
      currentIndex: 0,
      userId: params.userId,
      originalText: params.text,
      provider,
      voiceName: voiceId,
    };
    this.logger.info("TTS request", {
      provider: providerLabel,
      ...(voiceId && { model: voiceId }),
      language: params.language,
      chars: params.text.length,
    });
    this.voice.resetTimeout(params.guildId);
    if (!state.isPlaying && !state.currentItem && !state.starting) {
      state.starting = true;
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
