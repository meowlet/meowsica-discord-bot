import { Events, type PresenceData } from "discord.js";
import type { Logger } from "../shared/logger.ts";
import type { PresenceConfig } from "../config/index.ts";
import type { TtsCacheService } from "../features/tts/cache-service.ts";
import type { WavenetVoiceCatalog } from "../features/tts/voice-catalog.ts";
import type { PlayerManager } from "../features/tts/player-manager.ts";
import type { BotClient } from "./client.ts";

const HOUSEKEEPING_INTERVAL_MS = 30 * 60 * 1000;

export interface ReadyHandlerDeps {
  readonly logger: Logger;
  readonly presence: PresenceConfig;
  readonly cache: TtsCacheService;
  readonly voiceCatalog: WavenetVoiceCatalog;
  readonly player: PlayerManager;
}

export class ReadyHandler {
  private readonly logger: Logger;
  private readonly presence: PresenceConfig;
  private readonly cache: TtsCacheService;
  private readonly voiceCatalog: WavenetVoiceCatalog;
  private readonly player: PlayerManager;
  private housekeepingTimer: ReturnType<typeof setInterval> | null = null;
  private warmedUp = false;
  private cacheInitialized = false;
  private resumeListenerAttached = false;

  constructor(deps: ReadyHandlerDeps) {
    this.logger = deps.logger.withTag("READY");
    this.presence = deps.presence;
    this.cache = deps.cache;
    this.voiceCatalog = deps.voiceCatalog;
    this.player = deps.player;
  }

  async handle(client: BotClient): Promise<void> {
    if (!client.user) {
      this.logger.error("client.user is null on ready");
      return;
    }
    const shardInfo = client.getShardInfo();
    const guildCount = client.guilds.cache.size;
    this.logger.info(`${shardInfo} ready | ${guildCount} guilds`);
    if (!this.cacheInitialized) {
      await this.cache.initialize();
      this.cacheInitialized = true;
    }
    if (!this.warmedUp && this.shouldWarmupVoiceCatalog(client)) {
      this.warmedUp = true;
      this.voiceCatalog.warmup().catch((err) => {
        this.warmedUp = false;
        this.logger.warn("voice catalog warmup failed", err);
      });
    }
    this.applyPresence(client);
    this.attachResumeListener(client);
    this.resetHousekeepingTimer();
  }
