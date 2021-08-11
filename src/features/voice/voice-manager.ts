import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
  type VoiceConnection,
} from "@discordjs/voice";
import { PermissionFlagsBits, type VoiceBasedChannel } from "discord.js";
import type { Logger } from "../../shared/logger.ts";
import { VoiceJoinError } from "../../shared/errors.ts";
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
