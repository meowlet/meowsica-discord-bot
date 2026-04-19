import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
  type VoiceConnection,
} from "@discordjs/voice";
import type { VoiceBasedChannel } from "discord.js";
import type { Logger } from "../../shared/logger.ts";
import { Timeouts } from "../../shared/timeouts.ts";

interface GuildVoiceState {
  connection: VoiceConnection;
  channelId: string;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
}

export interface VoiceManagerDeps {
  readonly logger: Logger;
  readonly timeoutMs: number;
}

export class VoiceManager {
  private readonly logger: Logger;
  private readonly timeoutMs: number;
  private readonly states = new Map<string, GuildVoiceState>();
  private onLeave: ((guildId: string) => void) | null = null;

  constructor(deps: VoiceManagerDeps) {
    this.logger = deps.logger.withTag("VOICE");
    this.timeoutMs = deps.timeoutMs;
  }

  setLeaveListener(listener: (guildId: string) => void): void {
    this.onLeave = listener;
  }

  async join(channel: VoiceBasedChannel): Promise<VoiceConnection> {
    const guildId = channel.guild.id;
    const existing = this.states.get(guildId);
    if (existing && existing.channelId === channel.id) {
      this.resetTimeout(guildId);
      return existing.connection;
    }
    if (existing) this.leave(guildId);
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });
    try {
      await entersState(
        connection,
        VoiceConnectionStatus.Ready,
        Timeouts.VoiceReady,
      );
    } catch (error) {
      connection.destroy();
      throw new Error(`Failed to join voice channel: ${error}`);
    }
    this.states.set(guildId, {
      connection,
      channelId: channel.id,
      timeoutTimer: null,
    });
    this.startTimeout(guildId);
    this.logger.info("joined voice channel", {
      channelId: channel.id,
      channelName: channel.name,
    });
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(
            connection,
            VoiceConnectionStatus.Signalling,
            Timeouts.VoiceReconnect,
          ),
          entersState(
            connection,
            VoiceConnectionStatus.Connecting,
            Timeouts.VoiceReconnect,
          ),
        ]);
      } catch {
        this.leave(guildId);
      }
    });
    connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.cleanup(guildId);
    });
    return connection;
  }

  leave(guildId: string): boolean {
    const connection = getVoiceConnection(guildId);
    if (connection) {
      connection.destroy();
      this.cleanup(guildId);
      this.logger.info(`left voice channel guild=${guildId}`);
      return true;
    }
    this.cleanup(guildId);
    return false;
  }

  resetTimeout(guildId: string): void {
    this.startTimeout(guildId);
  }

  isConnected(guildId: string): boolean {
    return this.states.has(guildId);
  }

  getChannelId(guildId: string): string | null {
    return this.states.get(guildId)?.channelId ?? null;
  }

  shutdown(): void {
    for (const guildId of [...this.states.keys()]) {
      this.leave(guildId);
    }
  }

  private startTimeout(guildId: string): void {
    const state = this.states.get(guildId);
    if (!state) return;
    if (state.timeoutTimer) {
      clearTimeout(state.timeoutTimer);
      state.timeoutTimer = null;
    }
    if (this.timeoutMs <= 0) return;
    state.timeoutTimer = setTimeout(() => {
      this.leave(guildId);
    }, this.timeoutMs);
  }

  private cleanup(guildId: string): void {
    const state = this.states.get(guildId);
    if (!state) return;
    if (state.timeoutTimer) clearTimeout(state.timeoutTimer);
    this.states.delete(guildId);
    this.onLeave?.(guildId);
  }
}
