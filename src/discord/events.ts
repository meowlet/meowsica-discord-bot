import { Events, type Guild } from "discord.js";
import type { Logger } from "../shared/logger.ts";
import type { BotClient } from "./client.ts";
import type { InteractionRouter } from "./interaction-router.ts";
import type { VoiceManager } from "../features/voice/voice-manager.ts";
import type { GuildSettingsRepository } from "../features/settings/guild-settings-repo.ts";
import type { ReadyHandler } from "./ready-handler.ts";

export interface RegisterEventsParams {
  readonly client: BotClient;
  readonly router: InteractionRouter;
  readonly logger: Logger;
  readonly readyHandler: ReadyHandler;
  readonly voice: VoiceManager;
  readonly guildSettings: GuildSettingsRepository;
}

export function registerEvents(params: RegisterEventsParams): void {
  const { client, router, logger, readyHandler, voice, guildSettings } = params;
  client.once(Events.ClientReady, () => {
    readyHandler.handle(client).catch((err) => {
      logger.error("ready handler failed", err);
    });
  });
  client.on(Events.InteractionCreate, (interaction) => {
    router.route(interaction).catch((err) => {
      logger.error("unhandled interaction error", err);
    });
  });
  client.on(Events.GuildCreate, (guild) => {
    logger.info(`guild added: ${guild.name} (${guild.id})`);
  });
  client.on(Events.GuildDelete, (guild: Guild) => {
    voice.leave(guild.id);
    guildSettings
      .delete(guild.id)
      .catch((err) => logger.warn("guildDelete cleanup failed", err));
  });
  client.on(Events.Error, (err) => logger.error("discord client error", err));
  client.on(Events.Warn, (msg) => logger.warn("discord client warning", msg));
}
