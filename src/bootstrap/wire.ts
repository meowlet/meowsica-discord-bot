import { loadAppEnvConfig } from "../config/index.ts";
import { Logger, createRootLogger } from "../shared/logger.ts";
import { interactionContext } from "../shared/interaction-context.ts";
import { createDb } from "../infra/db.ts";
import { RedisClient } from "../infra/redis.ts";
import { GoogleCloudTtsClient } from "../infra/google-cloud-tts.ts";
import { SchemaMigrator } from "../features/settings/migration.ts";
import { isShardWorker } from "./runtime.ts";
import { UserPrefsRepository } from "../features/settings/user-prefs-repo.ts";
import { GuildSettingsRepository } from "../features/settings/guild-settings-repo.ts";
import { LocaleResolver } from "../features/settings/locale-resolver.ts";
import { UsageRepository } from "../features/quota/usage-repo.ts";
import { UsageService } from "../features/quota/usage-service.ts";
import { CommandLoggerService } from "../features/logs/command-logger-service.ts";
import { TtsCacheService } from "../features/tts/cache-service.ts";
import { WavenetVoiceCatalog } from "../features/tts/voice-catalog.ts";
import { BasicTtsProvider } from "../features/tts/basic-provider.ts";
import { WavenetTtsProvider } from "../features/tts/wavenet-provider.ts";
import { PlayerManager } from "../features/tts/player-manager.ts";
import { VoiceManager } from "../features/voice/voice-manager.ts";
import { BotClient } from "../discord/client.ts";
import { InteractionRouter } from "../discord/interaction-router.ts";
import { ReadyHandler } from "../discord/ready-handler.ts";
import type { Command, ComponentHandler } from "../shared/command.ts";
import { PingCommand } from "../features/misc/ping-command.ts";
import { HelpCommand } from "../features/misc/help-command.ts";
import { JoinCommand } from "../features/voice/join-command.ts";
import { LeaveCommand } from "../features/voice/leave-command.ts";
import { SayCommand } from "../features/tts/say-command.ts";
import { SkipCommand } from "../features/tts/skip-command.ts";
import { StopCommand } from "../features/tts/stop-command.ts";
import { QueueCommand } from "../features/tts/queue-command.ts";
import { VoiceCommand } from "../features/settings/voice-command.ts";
import { LanguageCommand } from "../features/settings/language-command.ts";
import { ProfileCommand } from "../features/quota/profile-command.ts";
import { VoiceSettingsHandler } from "../features/settings/voice-settings/handler.ts";
import { LanguageSettingsHandler } from "../features/settings/language-settings/handler.ts";
import { Timeouts } from "../shared/timeouts.ts";
import type { AppContext } from "./app-context.ts";

export async function createAppContext(): Promise<AppContext> {
  const config = loadAppEnvConfig();
  const logger = createRootLogger({
    level: config.bot.logLevel,
    jsonMode: config.bot.nodeEnv === "production",
    context: interactionContext,
  });
  logger.info("starting bootstrap");
  const db = createDb({
    url: config.database.url,
    maxConnections: config.database.maxConnections,
  });
  if (!isShardWorker()) {
    await new SchemaMigrator({ db, logger }).run();
  } else {
    logger.info("skipping migrations: running as shard worker");
  }
  const redis = await connectRedis(config.redis, logger);
  const googleCloudTts = config.bot.googleCloudApiKey
    ? new GoogleCloudTtsClient({
        apiKey: config.bot.googleCloudApiKey,
        logger,
      })
    : null;
  const userPrefs = new UserPrefsRepository({ db, redis });
  const guildSettings = new GuildSettingsRepository({
    db,
    redis,
  });
  const localeResolver = new LocaleResolver({ userPrefs, guildSettings });
  const usageRepo = new UsageRepository({ db });
  const usage = new UsageService({
    repo: usageRepo,
    logger,
    monthlyLimit: config.bot.monthlyQuotaLimit,
  });
  const commandLogger = new CommandLoggerService({ db, logger });
  const ttsCache = new TtsCacheService({ logger, shardId: resolveShardId() });
  const voiceCatalog = new WavenetVoiceCatalog({
    client: googleCloudTts,
