import type { PresenceData } from "discord.js";
import type { Logger } from "../shared/logger.ts";
import type { PresenceConfig } from "../config/index.ts";
import type { TtsCacheService } from "../features/tts/cache-service.ts";
import type { WavenetVoiceCatalog } from "../features/tts/voice-catalog.ts";
import type { PlayerManager } from "../features/tts/player-manager.ts";
import type { BotClient } from "./client.ts";

const PRESENCE_INTERVAL_MS = 15 * 60 * 1000;
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
  private presenceTimer: ReturnType<typeof setInterval> | null = null;
  private housekeepingTimer: ReturnType<typeof setInterval> | null = null;

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
    await this.cache.initialize();
    this.voiceCatalog.warmup().catch((err) => {
      this.logger.warn("voice catalog warmup failed", err);
    });
    this.applyPresence(client);
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.presenceTimer = setInterval(
      () => this.applyPresence(client),
      PRESENCE_INTERVAL_MS,
    );
    if (this.housekeepingTimer) clearInterval(this.housekeepingTimer);
    this.housekeepingTimer = setInterval(
      () => this.runHousekeeping(),
      HOUSEKEEPING_INTERVAL_MS,
    );
  }

  shutdown(): void {
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    if (this.housekeepingTimer) clearInterval(this.housekeepingTimer);
    this.presenceTimer = null;
    this.housekeepingTimer = null;
  }

  private applyPresence(client: BotClient): void {
    if (!client.user) return;
    const data: PresenceData = {
      status: this.presence.status,
      activities: [
        {
          name: this.presence.activityName,
          type: this.presence.activityType,
        },
      ],
    };
    client.user.setPresence(data);
  }

  private async runHousekeeping(): Promise<void> {
    try {
      const idleCleaned = this.player.cleanupIdle();
      if (idleCleaned > 0) {
        this.logger.info(
          `housekeeping: cleaned ${idleCleaned} idle players (${this.player.getActiveGuildCount()} active)`,
        );
      }
      await this.cache.cleanup();
      const stats = await this.cache.stats();
      this.logger.debug("cache stats", {
        files: stats.totalFiles,
        sizeBytes: stats.totalSizeBytes,
      });
    } catch (err) {
      this.logger.warn("housekeeping error", err);
    }
  }
}
