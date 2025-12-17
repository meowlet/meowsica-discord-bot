import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
  type VoiceConnection,
} from "@discordjs/voice";
import type { VoiceBasedChannel } from "discord.js";
import { voiceLogger } from "../utils/logger.ts";

interface GuildVoiceState {
  connection: VoiceConnection;
  channelId: string;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
}

const guildStates = new Map<string, GuildVoiceState>();

// Get timeout from env (in minutes), default 5 minutes, 0 = no timeout
const TIMEOUT_MINUTES = parseInt(Bun.env["VOICE_TIMEOUT_MINUTES"] ?? "5", 10);
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;

function startTimeout(guildId: string): void {
  const state = guildStates.get(guildId);
  if (!state) return;

  if (state.timeoutTimer) {
    clearTimeout(state.timeoutTimer);
    state.timeoutTimer = null;
  }

  if (TIMEOUT_MS > 0) {
    state.timeoutTimer = setTimeout(() => {
      voiceLogger.info(
        `Timeout reached for guild ${guildId}, disconnecting...`
      );
      leaveChannel(guildId);
    }, TIMEOUT_MS);
  }
}

export function resetTimeout(guildId: string): void {
  startTimeout(guildId);
}

export async function joinChannel(
  channel: VoiceBasedChannel
): Promise<VoiceConnection> {
  const guildId = channel.guild.id;

  // Check if already connected to this channel
  const existingState = guildStates.get(guildId);
  if (existingState && existingState.channelId === channel.id) {
    resetTimeout(guildId);
    return existingState.connection;
  }

  // Leave existing channel if connected to a different one
  if (existingState) {
    leaveChannel(guildId);
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guildId,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    voiceLogger.success(`Joined voice channel: ${channel.name} (${channel.id})`);
  } catch (error) {
    connection.destroy();
    throw new Error(`Failed to join voice channel: ${error}`);
  }

  const state: GuildVoiceState = {
    connection,
    channelId: channel.id,
    timeoutTimer: null,
  };

  guildStates.set(guildId, state);

  // Start timeout timer
  startTimeout(guildId);

  // Handle disconnection events
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      leaveChannel(guildId);
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    cleanup(guildId);
  });

  return connection;
}

function cleanup(guildId: string): void {
  const state = guildStates.get(guildId);
  if (!state) return;

  if (state.timeoutTimer) {
    clearTimeout(state.timeoutTimer);
  }

  guildStates.delete(guildId);
  voiceLogger.debug(`Cleaned up state for guild ${guildId}`);
}

export function leaveChannel(guildId: string): boolean {
  const connection = getVoiceConnection(guildId);
  if (connection) {
    connection.destroy();
    cleanup(guildId);
    voiceLogger.info(`Left voice channel in guild ${guildId}`);
    return true;
  }
  return false;
}

export function isConnected(guildId: string): boolean {
  return guildStates.has(guildId);
}

export function getConnectionChannelId(guildId: string): string | null {
  return guildStates.get(guildId)?.channelId ?? null;
}
